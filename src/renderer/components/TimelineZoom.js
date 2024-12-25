import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../utils/zoomUtils.js';

export class TimelineZoom {
    constructor(timeline) {
        this.timeline = timeline;
        this.zoomLevel = 1;
    }

    handleZoom(event) {
        if (event.ctrlKey) {
            event.preventDefault();
            
            const rect = this.timeline.container.getBoundingClientRect();
            const mouseY = event.clientY - rect.top;
            
            const mouseRatio = (mouseY + this.timeline.container.scrollTop) / this.timeline.content.offsetHeight;
            
            const delta = event.deltaY < 0 ? 1 : -1;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoomLevel + (delta * ZOOM_STEP)));
            
            if (newZoom !== this.zoomLevel) {
                this.timeline.content.style.transition = 'none';
                
                const startHeight = this.timeline.content.offsetHeight;
                const startScrollTop = this.timeline.container.scrollTop;
                const endHeight = this.timeline.container.offsetHeight * newZoom;
                const endScrollTop = (mouseRatio * endHeight) - mouseY;
                
                this.zoomLevel = newZoom;
                
                let animationStartTime = null;
                const duration = 150;
                
                const animate = (currentTime) => {
                    if (!animationStartTime) animationStartTime = currentTime;
                    const elapsed = currentTime - animationStartTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    const easeProgress = 1 - Math.pow(1 - progress, 2);
                    
                    const currentHeight = startHeight + (endHeight - startHeight) * easeProgress;
                    const currentScrollTop = startScrollTop + (endScrollTop - startScrollTop) * easeProgress;
                    
                    this.timeline.content.style.height = `${currentHeight}px`;
                    this.timeline.container.scrollTop = currentScrollTop;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        this.timeline.updateTimelineHeight();
                        this.timeline.events.renderEvents();
                    }
                };
                
                requestAnimationFrame(animate);
            }
        }
    }
}
