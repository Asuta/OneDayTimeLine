import { timeToDecimal } from '../utils/timeUtils.js';

class EventService {
    constructor() {
        this.events = [];
        this.listeners = new Set();
        console.log('EventService 初始化');
    }

    // 添加事件
    addEvent(event) {
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
        const hasConflict = this.events.some(existingEvent => {
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

    // 保存事件到本地存储
    saveEvents() {
        console.log('保存事件到本地存储');
        localStorage.setItem('timelineEvents', JSON.stringify(this.events));
    }

    // 从本地存储加载事件
    loadEvents() {
        console.log('从本地存储加载事件');
        const savedEvents = localStorage.getItem('timelineEvents');
        if (savedEvents) {
            try {
                this.events = JSON.parse(savedEvents);
                console.log('加载的事件:', this.events);
                this._notifyListeners();
            } catch (error) {
                console.error('加载事件失败:', error);
            }
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
}

// 导出单例实例
export const eventService = new EventService();
