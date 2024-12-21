import { hourToPosition, timeToDecimal } from '../utils/timeUtils.js';
import { smoothScroll, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, SCROLL_ANIMATION_DURATION } from '../utils/zoomUtils.js';
import { eventService } from '../services/eventService.js';

export class Timeline {
    constructor() {
        this.zoomLevel = 1;
        this.container = document.querySelector('.timeline-container');
        this.content = document.getElementById('timeline-content');
        this.eventsContainer = document.getElementById('events');
        
        this.initialize();
        this.bindEvents();
    }

    initialize() {
        // 设置初始高度为容器高度
        const containerHeight = this.container.offsetHeight;
        this.content.style.height = `${containerHeight}px`;
        
        // 更新时间刻度
        this.updateTimelineHeight();
        
        // 注册事件服务监听器
        eventService.addListener(() => this.renderEvents());
    }

    updateTimelineHeight() {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';
        
        for (let i = 0; i <= 24; i++) {
            const hour = document.createElement('div');
            hour.className = 'timeline-hour';
            hour.style.top = `${(i / 24) * 100}%`;
            hour.textContent = `${i.toString().padStart(2, '0')}:00`;
            timeline.appendChild(hour);
        }
    }

    handleZoom(event) {
        if (event.ctrlKey) {
            event.preventDefault();
            
            // 获取当前鼠标位置相对于容器的位置
            const rect = this.container.getBoundingClientRect();
            const mouseY = event.clientY - rect.top;
            
            // 计算鼠标位置对应的时间点
            const currentScrollTop = this.container.scrollTop;
            const mouseContentY = mouseY + currentScrollTop;
            
            // 确定滚动方向
            const delta = event.deltaY < 0 ? 1 : -1;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoomLevel + (delta * ZOOM_STEP)));
            
            if (newZoom !== this.zoomLevel) {
                // 保存旧的高度和容器信息
                const containerHeight = rect.height;
                const oldHeight = this.content.offsetHeight;
                
                // 计算鼠标位置在内容中的比例
                const mouseRatio = mouseContentY / oldHeight;
                
                // 更新缩放级别
                this.zoomLevel = newZoom;
                
                // 计算新的总高度
                const newHeight = containerHeight * this.zoomLevel;
                
                // 添加过渡效果
                this.content.style.transition = `height ${SCROLL_ANIMATION_DURATION}ms ease-out`;
                
                // 设置新的高度
                this.content.style.height = `${newHeight}px`;
                
                // 计算新的滚动位置
                const newScrollTop = (mouseRatio * newHeight) - mouseY;
                
                // 平滑更新滚动位置
                smoothScroll(this.container, newScrollTop, SCROLL_ANIMATION_DURATION);
                
                // 在过渡结束后移除过渡效果并更新其他内容
                setTimeout(() => {
                    this.content.style.transition = '';
                    this.updateTimelineHeight();
                    this.renderEvents();
                }, SCROLL_ANIMATION_DURATION);
            }
        }
    }

    renderEvents() {
        this.eventsContainer.innerHTML = '';
        const events = eventService.getAllEvents();
        
        events.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event';
            eventElement.style.backgroundColor = event.color;
            eventElement.style.top = `${hourToPosition(timeToDecimal(event.startTime))}%`;
            eventElement.style.height = `${hourToPosition(timeToDecimal(event.endTime) - timeToDecimal(event.startTime))}%`;
            eventElement.textContent = event.name;
            this.eventsContainer.appendChild(eventElement);
        });
    }

    bindEvents() {
        this.container.addEventListener('wheel', this.handleZoom.bind(this));
    }
}
