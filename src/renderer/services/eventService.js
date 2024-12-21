import { timeToDecimal } from '../utils/timeUtils.js';

class EventService {
    constructor() {
        this.events = [];
        this.listeners = new Set();
    }

    // 添加事件
    addEvent(event) {
        // 验证时间
        if (timeToDecimal(event.startTime) >= timeToDecimal(event.endTime)) {
            throw new Error('结束时间必须晚于开始时间！');
        }
        
        // 检查时间冲突
        const hasConflict = this.events.some(existingEvent => {
            const newStart = timeToDecimal(event.startTime);
            const newEnd = timeToDecimal(event.endTime);
            const eventStart = timeToDecimal(existingEvent.startTime);
            const eventEnd = timeToDecimal(existingEvent.endTime);
            
            return (newStart < eventEnd && newEnd > eventStart);
        });
        
        if (hasConflict) {
            throw new Error('该时间段与现有事件冲突！');
        }
        
        this.events.push(event);
        this.events.sort((a, b) => timeToDecimal(a.startTime) - timeToDecimal(b.startTime));
        this._notifyListeners();
    }

    // 删除事件
    deleteEvent(index) {
        this.events.splice(index, 1);
        this._notifyListeners();
    }

    // 获取所有事件
    getAllEvents() {
        return [...this.events];
    }

    // 保存事件到本地存储
    saveEvents() {
        localStorage.setItem('timelineEvents', JSON.stringify(this.events));
    }

    // 从本地存储加载事件
    loadEvents() {
        const savedEvents = localStorage.getItem('timelineEvents');
        if (savedEvents) {
            this.events = JSON.parse(savedEvents);
            this._notifyListeners();
        }
    }

    // 添加监听器
    addListener(listener) {
        this.listeners.add(listener);
    }

    // 移除监听器
    removeListener(listener) {
        this.listeners.delete(listener);
    }

    // 通知所有监听器
    _notifyListeners() {
        this.listeners.forEach(listener => listener(this.events));
        this.saveEvents();
    }
}

// 导出单例实例
export const eventService = new EventService();
