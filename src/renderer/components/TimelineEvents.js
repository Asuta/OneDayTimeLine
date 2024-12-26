import { timeToDecimal } from '../utils/timeUtils.js';
import { eventService } from '../services/eventService.js';

export class TimelineEvents {
    constructor(timeline) {
        this.timeline = timeline;
        this.shortEventThreshold = 0.01; // 15分钟
    }

    renderEvents() {
        this.timeline.eventsContainer.innerHTML = '';
        
        // 获取选定日期的事件
        const selectedDate = eventService.getSelectedDate();
        const events = eventService.getEventsByDate(selectedDate);
        
        events.forEach((event, index) => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event';
            eventElement.style.backgroundColor = event.color;
            
            const startTime = timeToDecimal(event.startTime);
            const endTime = timeToDecimal(event.endTime);
            
            // 计算位置（基于24小时）
            const startPercent = (startTime / 24) * 100;
            const heightPercent = ((endTime - startTime) / 24) * 100;
            
            // 使用设置的阈值判断是否为短事件
            if (endTime - startTime < this.shortEventThreshold) {
                eventElement.classList.add('short');
            }
            
            eventElement.style.top = `${startPercent}%`;
            eventElement.style.height = `${heightPercent}%`;
            
            // 计算浪费时间的比例
            if (event.wastedTime > 0) {
                const wastedTimePercent = Math.round((event.wastedTime / ((endTime - startTime) * 60)) * 100);
                eventElement.style.setProperty('--wasted-percent', `${Math.min(100, wastedTimePercent)}%`);
            }
            
            // 创建事件内容容器
            const contentDiv = document.createElement('div');
            contentDiv.className = 'event-content';
            
            // 添加事件名称
            const nameSpan = document.createElement('span');
            nameSpan.className = 'event-name';
            nameSpan.textContent = event.name;
            contentDiv.appendChild(nameSpan);
            
            // 添加时间信息
            const timeSpan = document.createElement('span');
            timeSpan.className = 'event-time';
            timeSpan.textContent = ` (${event.startTime}-${event.endTime})`;
            contentDiv.appendChild(timeSpan);
            
            // 添加浪费时间信息（如果有）
            if (event.wastedTime > 0) {
                const wastedTimeSpan = document.createElement('span');
                wastedTimeSpan.className = 'wasted-time';
                const wastedTimePercent = Math.round((event.wastedTime / ((endTime - startTime) * 60)) * 100);
                wastedTimeSpan.textContent = ` [浪费: ${wastedTimePercent}%(${event.wastedTime}分钟)]`;
                contentDiv.appendChild(wastedTimeSpan);
            }
            
            // 添加删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = '删除事件';
            
            // 阻止删除按钮的点击事件冒泡到事件块
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.timeline.dialog.createConfirmDialog('确定要删除这个事件吗？', () => {
                    eventService.deleteEvent(index);
                });
            });
            
            eventElement.appendChild(deleteBtn);
            eventElement.appendChild(contentDiv);
            
            // 添加双击编辑功能
            eventElement.addEventListener('dblclick', () => {
                this.editEvent(event, index);
            });
            
            this.timeline.eventsContainer.appendChild(eventElement);
        });
    }

    editEvent(event, index) {
        const startTimeDecimal = timeToDecimal(event.startTime);
        const endTimeDecimal = timeToDecimal(event.endTime);
        const totalMinutes = (endTimeDecimal - startTimeDecimal) * 60;
        const wastedTimePercent = Math.round((event.wastedTime / totalMinutes) * 100) || 0;

        this.timeline.dialog.createDialog('编辑事件', event.startTime, event.endTime, (name, color, dialogStartTime, dialogEndTime, wastedTime) => {
            if (name) {
                const updatedEvent = {
                    ...event,
                    name,
                    color,
                    startTime: dialogStartTime,
                    endTime: dialogEndTime,
                    wastedTime
                };
                
                try {
                    eventService.deleteEvent(index);
                    eventService.addEvent(updatedEvent);
                } catch (error) {
                    console.error('更新事件失败:', error);
                    this.timeline.dialog.createAlertDialog(error.message);
                    try {
                        eventService.addEvent(event);
                    } catch (restoreError) {
                        console.error('恢复原事件失败:', restoreError);
                        this.timeline.dialog.createAlertDialog('更新失败，且无法恢复原事件，请刷新页面。');
                    }
                }
            }
        }, event.name, event.color, wastedTimePercent);
    }
}
