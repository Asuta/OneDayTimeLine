import { timeToDecimal } from '../utils/timeUtils.js';
const fs = require('fs');
const path = require('path');
const { app } = require('@electron/remote');
const { ipcRenderer } = require('electron');

class EventService {
    constructor() {
        this.events = [];
        this.listeners = new Set();
        this.selectedDate = this.getCurrentDateString(); // 添加选定日期，默认为当前日期
        
        // 从localStorage获取自定义存储路径，如果没有则使用默认路径
        const storagePath = localStorage.getItem('storagePath');
        this.dataPath = storagePath ? 
            path.join(storagePath, 'events.json') : 
            path.join(app.getPath('userData'), 'events.json');
            
        console.log('EventService 初始化, 数据文件路径:', this.dataPath);
        
        // 监听存储路径变更
        ipcRenderer.on('set-storage-path', (event, newPath) => {
            this.setStoragePath(newPath);
        });
        
        // 监听数据导入
        ipcRenderer.on('import-data', (event, filePath) => {
            this.importData(filePath);
        });
        
        // 监听数据导出
        ipcRenderer.on('export-data', (event, filePath) => {
            this.exportData(filePath);
        });
    }
    
    // 获取当前日期字符串
    getCurrentDateString() {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    
    // 设置选定日期
    setSelectedDate(date) {
        this.selectedDate = date;
        console.log('设置选定日期:', date);
        this._notifyListeners(true);  // 添加true参数，跳过文件保存
    }
    
    // 获取选定日期
    getSelectedDate() {
        return this.selectedDate;
    }
    
    // 设置新的存储路径
    setStoragePath(newPath) {
        try {
            // 更新存储路径
            const newDataPath = path.join(newPath, 'events.json');
            
            // 检查新路径下是否存在数据文件
            if (fs.existsSync(newDataPath)) {
                // 如果存在，读取新路径的数据
                const data = fs.readFileSync(newDataPath, 'utf8');
                try {
                    const newEvents = JSON.parse(data);
                    // 验证数据格式
                    if (Array.isArray(newEvents)) {
                        // 更新路径和数据
                        this.dataPath = newDataPath;
                        localStorage.setItem('storagePath', newPath);
                        this.events = newEvents;
                        this._notifyListeners();
                        console.log('从新路径加载数据成功:', this.dataPath);
                    } else {
                        throw new Error('新路径下的数据格式不正确');
                    }
                } catch (parseError) {
                    throw new Error('新路径下的数据文件格式无效');
                }
            } else {
                // 如果不存在，清空当前数据并更新路径
                this.dataPath = newDataPath;
                localStorage.setItem('storagePath', newPath);
                this.events = [];
                this._notifyListeners();
                console.log('新路径下无数据，已清空事件列表:', this.dataPath);
            }
        } catch (error) {
            console.error('切换存储路径失败:', error);
            throw new Error('切换存储路径失败: ' + error.message);
        }
    }
    
    // 导入数据
    importData(filePath) {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            const importedEvents = JSON.parse(data);
            
            // 验证导入的数据
            if (!Array.isArray(importedEvents)) {
                throw new Error('导入的数据格式不正确');
            }
            
            // 检查每个事件的格式
            importedEvents.forEach(event => {
                if (!event.startTime || !event.endTime || !event.name || !event.date) {
                    throw new Error('导入的数据缺少必要字段');
                }
            });
            
            // 更新事件列表，但不保存文件
            this.events = importedEvents;
            this._notifyListeners(true);  // 传入true表示跳过保存
            console.log('数据导入成功');
        } catch (error) {
            console.error('导入数据失败:', error);
            throw new Error('导入数据失败: ' + error.message);
        }
    }
    
    // 导出数据
    exportData(filePath) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(this.events, null, 2), 'utf8');
            console.log('数据导出成功');
        } catch (error) {
            console.error('导出数据失败:', error);
            throw new Error('导出数据失败: ' + error.message);
        }
    }

    // 添加事件
    addEvent(event, excludeIndex = -1) {
        console.log('尝试添加事件:', event);
        
        // 验证时间
        const startDecimal = timeToDecimal(event.startTime);
        const endDecimal = timeToDecimal(event.endTime);
        
        console.log('时间转换:', {
            startTime: event.startTime,
            endTime: event.endTime,
            startDecimal,
            endDecimal
        });
        
        if (startDecimal >= endDecimal) {
            console.error('时间验证失败: 结束时间必须晚于开始时间');
            throw new Error('结束时间必须晚于开始时间！');
        }

        // 使用选定的日期
        const date = this.selectedDate;
        
        // 检查时间冲突
        const todayEvents = this.getEventsByDate(date);
        const hasConflict = todayEvents.some((existingEvent, index) => {
            // 如果是被排除的索引，跳过冲突检查
            if (index === excludeIndex) {
                return false;
            }
            
            const newStart = timeToDecimal(event.startTime);
            const newEnd = timeToDecimal(event.endTime);
            const eventStart = timeToDecimal(existingEvent.startTime);
            const eventEnd = timeToDecimal(existingEvent.endTime);
            
            // 只在时间重叠且颜色相同时才报告冲突
            const timeConflict = (newStart < eventEnd && newEnd > eventStart);
            const colorConflict = existingEvent.color === event.color;
            
            const conflict = timeConflict && colorConflict;
            if (conflict) {
                console.log('发现时间和颜色冲突:', {
                    new: { start: newStart, end: newEnd, color: event.color },
                    existing: { start: eventStart, end: eventEnd, color: existingEvent.color }
                });
            }
            return conflict;
        });

        if (hasConflict) {
            console.error('时间和颜色冲突验证失败');
            throw new Error('该时间段与相同颜色的现有事件冲突！');
        }

        // 添加日期字段到事件对象
        const eventWithDate = {
            ...event,
            date: date
        };

        this.events.push(eventWithDate);
        // 按日期和开始时间排序
        this.events.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            return timeToDecimal(a.startTime) - timeToDecimal(b.startTime);
        });
        
        console.log('事件添加成功，当前事件列表:', this.events);
        this._notifyListeners(false);  // 明确指定false，表示需要保存文件
    }

    // 删除事件
    deleteEvent(index) {
        console.log('删除事件:', index);
        // 获取当前选中日期的事件
        const selectedDate = this.getSelectedDate();
        const todayEvents = this.getEventsByDate(selectedDate);
        const eventToDelete = todayEvents[index];
        
        if (!eventToDelete) {
            console.error('未找到要删除的事件');
            return;
        }
        
        // 在所有事件中找到对应事件的索引
        const globalIndex = this.events.findIndex(event => 
            event.date === eventToDelete.date &&
            event.startTime === eventToDelete.startTime &&
            event.endTime === eventToDelete.endTime &&
            event.name === eventToDelete.name &&
            event.color === eventToDelete.color
        );
        
        if (globalIndex === -1) {
            console.error('在全局事件列表中未找到要删除的事件');
            return;
        }
        
        // 删除事件
        this.events.splice(globalIndex, 1);
        console.log('删除后的事件列表:', this.events);
        this._notifyListeners(false);  // 明确指定false，表示需要保存文件
    }

    // 获取所有事件
    getAllEvents() {
        return [...this.events];
    }

    // 获取指定日期的事件
    getEventsByDate(date) {
        return this.events.filter(event => event.date === date);
    }

    // 保存事件到JSON文件
    saveEvents() {
        console.log('保存事件到文件:', this.dataPath);
        try {
            // 确保目录存在
            const dir = path.dirname(this.dataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(this.dataPath, JSON.stringify(this.events, null, 2), 'utf8');
            console.log('事件保存成功');
        } catch (error) {
            console.error('保存事件失败:', error);
        }
    }

    // 从JSON文件加载事件
    loadEvents() {
        console.log('从文件加载事件:', this.dataPath);
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = fs.readFileSync(this.dataPath, 'utf8');
                this.events = JSON.parse(data);
                console.log('加载的事件:', this.events);
                this._notifyListeners();
            } else {
                console.log('数据文件不存在，使用空数组');
                this.events = [];
            }
        } catch (error) {
            console.error('加载事件失败:', error);
            this.events = [];
        }
    }

    // 添加监听器
    addListener(listener) {
        this.listeners.add(listener);
        console.log('添加监听器，当前监听器数量:', this.listeners.size);
    }

    // 移除监听器
    removeListener(listener) {
        this.listeners.delete(listener);
        console.log('移除监听器，当前监听器数量:', this.listeners.size);
    }

    // 通知所有监听器
    _notifyListeners(skipSave = false) {
        console.log('通知监听器');
        this.listeners.forEach(listener => {
            try {
                listener(this.events);
            } catch (error) {
                console.error('监听器执行失败:', error);
            }
        });
        if (!skipSave) {
            this.saveEvents();
        }
    }

    // 清空所有事件
    clearAllEvents() {
        this.events = [];
        console.log('清空所有事件');
        this._notifyListeners(false);  // 明确指定false，表示需要保存文件
    }
}

// 导出单例实例
export const eventService = new EventService();
