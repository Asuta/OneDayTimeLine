import { Timeline } from './components/Timeline.js';
import { EventForm } from './components/EventForm.js';
import { EventList } from './components/EventList.js';
import { eventService } from './services/eventService.js';

// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', () => {
    // 初始化各个组件
    const timeline = new Timeline();
    const eventForm = new EventForm();
    const eventList = new EventList();
    
    // 加载保存的事件
    eventService.loadEvents();
});
