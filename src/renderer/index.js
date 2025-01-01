import { Timeline } from './components/Timeline.js';
import { EventList } from './components/EventList.js';
import { Calendar } from './components/Calendar.js';
import { eventService } from './services/eventService.js';

document.addEventListener('DOMContentLoaded', () => {
    // 先加载事件数据
    eventService.loadEvents();
    
    // 然后初始化组件
    new Timeline();
    new EventList();
    new Calendar();
});
