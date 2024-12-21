// 存储事件数据
let events = [];

// 添加缩放相关变量
let zoomLevel = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.1;

// 初始化时间轴
function initializeTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = ''; // 清空现有内容
    
    for (let i = 0; i <= 24; i++) {
        const hour = document.createElement('div');
        hour.className = 'timeline-hour';
        hour.style.top = `${(i / 24) * 100 * zoomLevel}%`;
        hour.textContent = `${i.toString().padStart(2, '0')}:00`;
        timeline.appendChild(hour);
    }
}

// 时间字符串转换为小数小时
function timeToDecimal(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
}

// 小数小时转换为百分比位置
function hourToPosition(hour) {
    return (hour / 24) * 100;
}

// 更新时间轴高度
function updateTimelineHeight() {
    const timelineContent = document.getElementById('timeline-content');
    timelineContent.style.height = `${100 * zoomLevel}%`;
}

// 处理缩放事件
function handleZoom(event) {
    if (event.ctrlKey) {
        event.preventDefault();
        
        // 确定滚动方向
        const delta = event.deltaY < 0 ? 1 : -1;
        
        // 计算新的缩放级别
        const newZoom = zoomLevel + (delta * ZOOM_STEP);
        
        // 限制缩放范围
        if (newZoom >= MIN_ZOOM && newZoom <= MAX_ZOOM) {
            zoomLevel = newZoom;
            updateTimelineHeight();
            
            // 重新渲染事件以适应新的缩放级别
            renderEvents();
        }
    }
}

// 渲染事件
function renderEvents() {
    const eventsContainer = document.getElementById('events');
    const eventsList = document.getElementById('eventsList');
    
    // 清空现有内容
    eventsContainer.innerHTML = '';
    eventsList.innerHTML = '';
    
    events.forEach((event, index) => {
        // 创建时间轴上的事件显示
        const eventElement = document.createElement('div');
        eventElement.className = 'event';
        eventElement.style.backgroundColor = event.color;
        eventElement.style.top = `${hourToPosition(timeToDecimal(event.startTime)) * zoomLevel}%`;
        eventElement.style.height = `${hourToPosition(timeToDecimal(event.endTime) - timeToDecimal(event.startTime)) * zoomLevel}%`;
        eventElement.textContent = event.name;
        eventsContainer.appendChild(eventElement);
        
        // 创建事件列表项
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item';
        eventItem.innerHTML = `
            <div class="event-header">
                <span>${event.name}</span>
                <button class="delete-btn" onclick="deleteEvent(${index})">删除</button>
            </div>
            <div>${event.startTime} - ${event.endTime}</div>
        `;
        eventsList.appendChild(eventItem);
    });
}

// 添加新事件
document.getElementById('eventForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const name = document.getElementById('eventName').value;
    const color = document.getElementById('eventColor').value;
    
    // 验证时间
    if (timeToDecimal(startTime) >= timeToDecimal(endTime)) {
        alert('结束时间必须晚于开始时间！');
        return;
    }
    
    // 检查时间冲突
    const hasConflict = events.some(event => {
        const newStart = timeToDecimal(startTime);
        const newEnd = timeToDecimal(endTime);
        const eventStart = timeToDecimal(event.startTime);
        const eventEnd = timeToDecimal(event.endTime);
        
        return (newStart < eventEnd && newEnd > eventStart);
    });
    
    if (hasConflict) {
        alert('该时间段与现有事件冲突！');
        return;
    }
    
    events.push({ startTime, endTime, name, color });
    events.sort((a, b) => timeToDecimal(a.startTime) - timeToDecimal(b.startTime));
    
    renderEvents();
    e.target.reset();
});

// 删除事件
window.deleteEvent = function(index) {
    events.splice(index, 1);
    renderEvents();
};

// 保存事件到本地存储
function saveEvents() {
    localStorage.setItem('timelineEvents', JSON.stringify(events));
}

// 从本地存储加载事件
function loadEvents() {
    const savedEvents = localStorage.getItem('timelineEvents');
    if (savedEvents) {
        events = JSON.parse(savedEvents);
        renderEvents();
    }
}

// 监听事件变化并保存
const observer = new MutationObserver(() => {
    saveEvents();
});

observer.observe(document.getElementById('events'), {
    childList: true,
    subtree: true
});

// 添加缩放事件监听器
document.addEventListener('DOMContentLoaded', () => {
    const timelineContainer = document.querySelector('.timeline-container');
    timelineContainer.addEventListener('wheel', handleZoom);
    
    initializeTimeline();
    loadEvents();
}); 