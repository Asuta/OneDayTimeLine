// 缩放相关常量
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 0.1;
export const SCROLL_ANIMATION_DURATION = 50; // 毫秒

// 平滑滚动函数
export function smoothScroll(element, target, duration) {
    const start = element.scrollTop;
    const change = target - start;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用 easeOutQuad 缓动函数使动画更自然
        const easeProgress = 1 - (1 - progress) * (1 - progress);
        element.scrollTop = start + change * easeProgress;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}
