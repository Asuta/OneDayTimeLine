import { eventService } from '../services/eventService.js';

export class EventList {
    constructor() {
        this.container = document.getElementById('eventsList');
        this.initialize();
    }

    initialize() {
        eventService.addListener(() => this.render());
    }

    render() {
        this.container.innerHTML = '';
        const events = eventService.getAllEvents();
        
        events.forEach((event, index) => {
            const eventItem = document.createElement('div');
            eventItem.className = 'event-item';
            eventItem.innerHTML = `
                <div class="event-header">
                    <span>${event.name}</span>
                    <button class="delete-btn">删除</button>
                </div>
                <div>${event.startTime} - ${event.endTime}</div>
            `;
            
            // 添加删除事件监听器
            const deleteBtn = eventItem.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                eventService.deleteEvent(index);
            });
            
            this.container.appendChild(eventItem);
        });
    }
}
