import { TimelineEvents } from './TimelineEvents.js';
import { TimelineDialog } from './TimelineDialog.js';
import { TimelineDrag } from './TimelineDrag.js';
import { TimelineZoom } from './TimelineZoom.js';
import { TimelineTheme } from './TimelineTheme.js';
import { eventService } from '../services/eventService.js';

export class Timeline {
    constructor() {
        this.container = document.querySelector('.timeline-container');
        this.content = document.getElementById('timeline-content');
        this.eventsContainer = document.getElementById('events');
        
        // 初始化各个模块
        this.events = new TimelineEvents(this);
        this.dialog = new TimelineDialog(this);
        this.drag = new TimelineDrag(this);
        this.zoom = new TimelineZoom(this);
        this.theme = new TimelineTheme(this);
        
        this.initialize();
        this.bindEvents();
        this.initializeTimeTooltip();
    }

    initialize() {
        const containerHeight = this.container.offsetHeight;
        this.content.style.height = `${containerHeight}px`;
        
        this.updateTimelineHeight();
        
        eventService.addListener(() => this.events.renderEvents());

        // 添加清空按钮
        const eventList = document.querySelector('.event-list');
        if (eventList) {
            const header = document.createElement('div');
            header.className = 'event-list-header';
            header.innerHTML = `
                <h2>事件列表</h2>
                <button class="clear-all-btn">清空所有事件</button>
            `;
            
            eventList.insertBefore(header, eventList.firstChild);
            
            const clearBtn = header.querySelector('.clear-all-btn');
            clearBtn.addEventListener('click', () => {
                this.dialog.createConfirmDialog('确定要清空所有事件吗？', () => {
                    eventService.clearAllEvents();
                });
            });
        }
    }

    initializeTimeTooltip() {
        const tooltip = document.createElement('div');
        tooltip.className = 'time-tooltip';
        document.body.appendChild(tooltip);
        this.tooltip = tooltip;

        const indicator = document.createElement('div');
        indicator.className = 'time-indicator';
        this.content.appendChild(indicator);
        this.indicator = indicator;

        this.content.addEventListener('mousemove', (e) => {
            const timeline = document.getElementById('timeline');
            const timelineRect = timeline.getBoundingClientRect();
            
            const relativePosition = (e.clientY - timelineRect.top) / timelineRect.height;
            const totalHours = relativePosition * 24;
            
            if (totalHours < 0 || totalHours > 24) {
                this.tooltip.style.display = 'none';
                this.indicator.style.display = 'none';
                return;
            }
            
            const hours = Math.floor(totalHours);
            const minutes = Math.floor((totalHours - hours) * 60);
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            this.tooltip.style.display = 'block';
            this.tooltip.style.left = `${e.clientX + 10}px`;
            this.tooltip.style.top = `${e.clientY + 10}px`;
            this.tooltip.textContent = timeString;

            const exactPosition = (totalHours / 24) * this.content.offsetHeight;
            this.indicator.style.display = 'block';
            this.indicator.style.top = `${exactPosition}px`;
        });

        this.content.addEventListener('mouseleave', () => {
            this.tooltip.style.display = 'none';
            this.indicator.style.display = 'none';
        });
    }

    updateTimelineHeight() {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';
        
        for (let i = 0; i <= 24; i++) {
            const hourContainer = document.createElement('div');
            hourContainer.style.position = 'absolute';
            hourContainer.style.top = `${(i / 24) * 100}%`;
            hourContainer.style.width = '100%';
            
            const hourText = document.createElement('div');
            hourText.className = 'timeline-hour';
            hourText.textContent = `${i.toString().padStart(2, '0')}:00`;
            hourContainer.appendChild(hourText);
            
            const hourMark = document.createElement('div');
            hourMark.className = 'timeline-mark hour';
            hourContainer.appendChild(hourMark);
            
            timeline.appendChild(hourContainer);
            
            if (i < 24) {
                const halfHourContainer = document.createElement('div');
                halfHourContainer.style.position = 'absolute';
                halfHourContainer.style.top = `${((i + 0.5) / 24) * 100}%`;
                halfHourContainer.style.width = '100%';
                
                const halfHourMark = document.createElement('div');
                halfHourMark.className = 'timeline-mark half-hour';
                halfHourContainer.appendChild(halfHourMark);
                
                timeline.appendChild(halfHourContainer);
            }
        }
    }

    bindEvents() {
        this.container.addEventListener('wheel', (e) => this.zoom.handleZoom(e));
        
        this.content.addEventListener('mousedown', (e) => this.drag.handleDragStart(e));
        document.addEventListener('mousemove', (e) => this.drag.handleDragMove(e));
        document.addEventListener('mouseup', () => this.drag.handleDragEnd());
    }
}
