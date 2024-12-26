import { timeToDecimal } from '../utils/timeUtils.js';
import { eventService } from '../services/eventService.js';

export class TimelineDrag {
    constructor(timeline) {
        this.timeline = timeline;
        this.isDragging = false;
        this.dragStartTime = null;
        this.tempEvent = null;
        this.adjustedStartTime = null;
        this.adjustedEndTime = null;
    }

    handleDragStart(e) {
        if (e.button !== 0) return;
        
        const timeline = document.getElementById('timeline');
        const timelineRect = timeline.getBoundingClientRect();
        
        if (e.clientX > timelineRect.right) {
            if (this.tempEvent) {
                this.tempEvent.remove();
                this.tempEvent = null;
            }
            this.adjustedStartTime = null;
            this.adjustedEndTime = null;
            
            this.isDragging = true;
            
            const relativePosition = (e.clientY - timelineRect.top) / timelineRect.height;
            this.dragStartTime = relativePosition * 24;
            
            this.tempEvent = document.createElement('div');
            this.tempEvent.className = 'event temp-event';
            this.tempEvent.style.backgroundColor = 'rgba(0, 123, 255, 0.5)';
            this.tempEvent.style.border = '2px dashed #007bff';
            
            const startPercent = relativePosition * 100;
            this.tempEvent.style.top = `${startPercent}%`;
            this.tempEvent.style.height = '0';
            
            this.timeline.eventsContainer.appendChild(this.tempEvent);
        }
    }

    handleDragMove(e) {
        if (!this.isDragging || !this.tempEvent) return;
        
        const timeline = document.getElementById('timeline');
        const timelineRect = timeline.getBoundingClientRect();
        
        const relativePosition = (e.clientY - timelineRect.top) / timelineRect.height;
        const currentTime = relativePosition * 24;
        
        // 获取当前选定日期的事件
        const selectedDate = eventService.getSelectedDate();
        const events = eventService.getEventsByDate(selectedDate);
        
        let startTime = Math.min(this.dragStartTime, currentTime);
        let endTime = Math.max(this.dragStartTime, currentTime);
        
        const formatTime = (hour) => {
            const h = Math.floor(Math.max(0, Math.min(23, hour)));
            const m = Math.floor((hour - Math.floor(hour)) * 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        let formattedStartTime = formatTime(startTime);
        let formattedEndTime = formatTime(endTime);
        
        events.forEach(event => {
            if ((formattedStartTime < event.endTime && formattedEndTime > event.startTime)) {
                if (Math.abs(timeToDecimal(formattedEndTime) - timeToDecimal(event.startTime)) < 
                    Math.abs(timeToDecimal(formattedStartTime) - timeToDecimal(event.endTime))) {
                    formattedEndTime = event.startTime;
                    endTime = timeToDecimal(event.startTime);
                } else {
                    formattedStartTime = event.endTime;
                    startTime = timeToDecimal(event.endTime);
                }
            }
        });

        const startPercent = (startTime / 24) * 100;
        const heightPercent = ((endTime - startTime) / 24) * 100;
        
        this.tempEvent.style.top = `${startPercent}%`;
        this.tempEvent.style.height = `${heightPercent}%`;
        
        if (Math.abs(endTime - startTime) < this.timeline.events.shortEventThreshold) {
            this.tempEvent.classList.add('short');
        } else {
            this.tempEvent.classList.remove('short');
        }
        
        this.adjustedStartTime = formattedStartTime;
        this.adjustedEndTime = formattedEndTime;
        
        this.tempEvent.textContent = `${formattedStartTime} - ${formattedEndTime}`;
    }

    handleDragEnd() {
        if (!this.isDragging || !this.tempEvent) return;
        
        const wasDragging = this.isDragging;
        
        this.isDragging = false;
        if (this.tempEvent) {
            this.tempEvent.remove();
            this.tempEvent = null;
        }
        
        if (!wasDragging || !this.adjustedStartTime || !this.adjustedEndTime) {
            this.adjustedStartTime = null;
            this.adjustedEndTime = null;
            return;
        }
        
        const formattedStartTime = this.adjustedStartTime;
        const formattedEndTime = this.adjustedEndTime;
        
        this.adjustedStartTime = null;
        this.adjustedEndTime = null;
        
        this.timeline.dialog.createDialog('新建事件', formattedStartTime, formattedEndTime, (name, color, dialogStartTime, dialogEndTime, wastedTime) => {
            if (name) {
                const event = {
                    startTime: dialogStartTime || formattedStartTime,
                    endTime: dialogEndTime || formattedEndTime,
                    name,
                    color: color || '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
                    wastedTime
                };
                
                try {
                    eventService.addEvent(event);
                } catch (error) {
                    console.error('添加事件失败:', error);
                    this.timeline.dialog.createAlertDialog(error.message);
                }
            }
        });
    }
}
