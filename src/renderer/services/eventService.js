import { timeToDecimal } from '../utils/timeUtils.js';
const fs = require('fs');
const path = require('path');
const { app } = require('@electron/remote');

class EventService {
    constructor() {
        this.events = [];
        this.listeners = new Set();
        // 获取用户数据目录
        this.dataPath = path.join(app.getPath('userData'), 'events.json');
        console.log('EventService 初始化, 数据文件路径:', this.dataPath);
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
        
        // 检查时间冲突
        const hasConflict = this.events.some((existingEvent, index) => {
            // 如果是被排除的索引，跳过冲突检查
            if (index === excludeIndex) {
                return false;
            }
            
            const newStart = timeToDecimal(event.startTime);
            const newEnd = timeToDecimal(event.endTime);
            const eventStart = timeToDecimal(existingEvent.startTime);
            const eventEnd = timeToDecimal(existingEvent.endTime);
            
            const conflict = (newStart < eventEnd && newEnd > eventStart);
            if (conflict) {
                console.log('发现时间冲突:', {
                    new: { start: newStart, end: newEnd },
                    existing: { start: eventStart, end: eventEnd }
                });
            }
            return conflict;
        });
        
        if (hasConflict) {
            console.error('时间冲突验证失败');
            throw new Error('该时间段与现有事件冲突！');
        }

        this.events.push(event);
        this.events.sort((a, b) => timeToDecimal(a.startTime) - timeToDecimal(b.startTime));
        console.log('事件添加成功，当前事件列表:', this.events);
        this._notifyListeners();
    }

    // 删除事件
    deleteEvent(index) {
        console.log('删除事件:', index);
        this.events.splice(index, 1);
        console.log('删除后的事件列表:', this.events);
        this._notifyListeners();
    }

    // 获取所有事件
    getAllEvents() {
        return [...this.events];
    }

    // 保存事件到JSON文件
    saveEvents() {
        console.log('保存事件到文件:', this.dataPath);
        try {
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
    _notifyListeners() {
        console.log('通知监听器');
        this.listeners.forEach(listener => {
            try {
                listener(this.events);
            } catch (error) {
                console.error('监听器执行失败:', error);
            }
        });
        this.saveEvents();
    }

    // 清空所有事件
    clearAllEvents() {
        this.events = [];
        console.log('清空所有事件');
        this._notifyListeners();
    }
}

// 导出单例实例
export const eventService = new EventService();
