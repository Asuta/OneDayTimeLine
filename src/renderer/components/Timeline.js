import { hourToPosition, timeToDecimal } from '../utils/timeUtils.js';
import { smoothScroll, MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, SCROLL_ANIMATION_DURATION } from '../utils/zoomUtils.js';
import { eventService } from '../services/eventService.js';

export class Timeline {
    constructor() {
        this.zoomLevel = 1;
        this.container = document.querySelector('.timeline-container');
        this.content = document.getElementById('timeline-content');
        this.eventsContainer = document.getElementById('events');
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        
        // 短事件的时间阈值（小时）
        this.shortEventThreshold = 0.01; // 15分钟，您可以根据需要调整这个值
        
        // 拖拽相关状态
        this.isDragging = false;
        this.dragStartY = 0;
        this.tempEvent = null;
        
        this.initialize();
        this.bindEvents();
        this.initializeThemeToggle();
        this.initializeTimeTooltip();
    }

    initialize() {
        // 设置初始高度为容器高度
        const containerHeight = this.container.offsetHeight;
        this.content.style.height = `${containerHeight}px`;
        
        // 更新时间刻度
        this.updateTimelineHeight();
        
        // 注册事件服务监听器
        eventService.addListener(() => this.renderEvents());

        // 应用保存的主题
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
        }
    }

    initializeThemeToggle() {
        // 创建主题切换按钮
        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle';
        themeToggle.innerHTML = `<i>${this.isDarkMode ? '☀️' : '🌙'}</i>`;
        document.body.appendChild(themeToggle);

        // 添加点击事件
        themeToggle.addEventListener('click', () => {
            this.isDarkMode = !this.isDarkMode;
            document.body.classList.toggle('dark-mode');
            themeToggle.innerHTML = `<i>${this.isDarkMode ? '☀️' : '🌙'}</i>`;
            localStorage.setItem('darkMode', this.isDarkMode);
        });
    }

    initializeTimeTooltip() {
        // 创建时间提示框
        const tooltip = document.createElement('div');
        tooltip.className = 'time-tooltip';
        document.body.appendChild(tooltip);
        this.tooltip = tooltip;

        // 创建时间指示虚线
        const indicator = document.createElement('div');
        indicator.className = 'time-indicator';
        this.content.appendChild(indicator);
        this.indicator = indicator;

        // 监听时间轴区域的鼠标移动
        this.content.addEventListener('mousemove', (e) => {
            const timeline = document.getElementById('timeline');
            const timelineRect = timeline.getBoundingClientRect();
            const contentRect = this.content.getBoundingClientRect();
            const scrollTop = this.container.scrollTop;
            
            // 计算鼠标在时间轴上的相对位置（0-1之间的值）
            const relativePosition = (e.clientY - timelineRect.top) / timelineRect.height;
            
            // 将相对位置转换为24小时制的时间（0-24之间的值）
            const totalHours = relativePosition * 24;
            
            // 如果时间超出范围，隐藏tooltip和指示线
            if (totalHours < 0 || totalHours > 24) {
                this.tooltip.style.display = 'none';
                this.indicator.style.display = 'none';
                return;
            }
            
            // 计算小时和分钟
            const hours = Math.floor(totalHours);
            const minutes = Math.floor((totalHours - hours) * 60);
            
            // 格式化时间字符串
            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            
            // 更新提示框位置和内容
            this.tooltip.style.display = 'block';
            this.tooltip.style.left = `${e.clientX + 10}px`;
            this.tooltip.style.top = `${e.clientY + 10}px`;
            this.tooltip.textContent = timeString;

            // 计算指示线的实际位置（考虑滚动和缩放）
            const exactPosition = (totalHours / 24) * this.content.offsetHeight;
            
            // 更新指示线位置
            this.indicator.style.display = 'block';
            this.indicator.style.top = `${exactPosition}px`;
        });

        // 鼠标离开时间轴区域时隐藏提示框和指示线
        this.content.addEventListener('mouseleave', () => {
            this.tooltip.style.display = 'none';
            this.indicator.style.display = 'none';
        });
    }

    updateTimelineHeight() {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';
        
        // 添加24小时的刻度
        for (let i = 0; i <= 24; i++) {
            // 添加整点刻度和时间
            const hourContainer = document.createElement('div');
            hourContainer.style.position = 'absolute';
            hourContainer.style.top = `${(i / 24) * 100}%`;
            hourContainer.style.width = '100%';
            
            // 添加时间文本
            const hourText = document.createElement('div');
            hourText.className = 'timeline-hour';
            hourText.textContent = `${i.toString().padStart(2, '0')}:00`;
            hourContainer.appendChild(hourText);
            
            // 添加整点刻度线
            const hourMark = document.createElement('div');
            hourMark.className = 'timeline-mark hour';
            hourContainer.appendChild(hourMark);
            
            timeline.appendChild(hourContainer);
            
            // 如果不是最后一个小时，添加半小时刻度
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

    // 创建确认删除对话框
    createConfirmDialog(message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog confirm-dialog';
        
        dialog.innerHTML = `
            <div class="dialog-content">
                <p>${message}</p>
                <div class="dialog-buttons">
                    <button class="cancel">取消</button>
                    <button class="confirm">确定</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 处理按钮点击
        dialog.querySelector('.confirm').addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (onConfirm) onConfirm();
        });
        
        dialog.querySelector('.cancel').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // 处理ESC键
        document.addEventListener('keyup', function handleEsc(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keyup', handleEsc);
            }
        });
    }

    renderEvents() {
        this.eventsContainer.innerHTML = '';
        const events = eventService.getAllEvents();
        
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
            
            // 添加删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = '删除事件';
            
            // 阻止删除按钮的点击事件冒泡到事件块
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.createConfirmDialog('确定要删除这个事件吗？', () => {
                    eventService.deleteEvent(index);
                });
            });
            
            eventElement.appendChild(deleteBtn);
            eventElement.appendChild(contentDiv);
            
            // 添加双击编辑功能
            eventElement.addEventListener('dblclick', () => {
                this.editEvent(event, index);
            });
            
            this.eventsContainer.appendChild(eventElement);
        });
    }

    // 编辑事件的方法
    editEvent(event, index) {
        this.createDialog('编辑事件', event.startTime, event.endTime, (name, color, dialogStartTime, dialogEndTime) => {
            if (name) {
                const updatedEvent = {
                    ...event,
                    name,
                    color,
                    startTime: dialogStartTime,
                    endTime: dialogEndTime
                };
                
                try {
                    // 先从eventService中删除原事件
                    eventService.deleteEvent(index);
                    
                    // 再添加更新后的事件
                    eventService.addEvent(updatedEvent);
                    
                } catch (error) {
                    console.error('更新事件失败:', error);
                    alert(error.message);
                    // 如果更新失败，恢复原事件
                    try {
                        eventService.addEvent(event);
                    } catch (restoreError) {
                        console.error('恢复原事件失败:', restoreError);
                        alert('更新失败，且无法恢复原事件，请刷新页面。');
                    }
                }
            }
        }, event.name); // 传入默认名称
    }

    bindEvents() {
        this.container.addEventListener('wheel', this.handleZoom.bind(this));
        
        // 添加拖拽相关事件监听
        this.content.addEventListener('mousedown', this.handleDragStart.bind(this));
        document.addEventListener('mousemove', this.handleDragMove.bind(this));
        document.addEventListener('mouseup', this.handleDragEnd.bind(this));
    }

    handleDragStart(e) {
        // 只响应左键点击
        if (e.button !== 0) return;
        
        const timeline = document.getElementById('timeline');
        const timelineRect = timeline.getBoundingClientRect();
        
        // 确保点击在时间轴区域内
        if (e.clientX > timelineRect.right) {
            // 清理之前可能存在的状态
            if (this.tempEvent) {
                this.tempEvent.remove();
                this.tempEvent = null;
            }
            this.adjustedStartTime = null;
            this.adjustedEndTime = null;
            
            this.isDragging = true;
            
            // 计算相对于时间轴的位置
            const relativePosition = (e.clientY - timelineRect.top) / timelineRect.height;
            this.dragStartTime = relativePosition * 24;
            
            // 创建临时事件元素
            this.tempEvent = document.createElement('div');
            this.tempEvent.className = 'event temp-event';
            this.tempEvent.style.backgroundColor = 'rgba(0, 123, 255, 0.5)';
            this.tempEvent.style.border = '2px dashed #007bff';
            
            // 设置初始位置
            const startPercent = relativePosition * 100;
            this.tempEvent.style.top = `${startPercent}%`;
            this.tempEvent.style.height = '0';
            
            this.eventsContainer.appendChild(this.tempEvent);
        }
    }

    handleDragMove(e) {
        if (!this.isDragging || !this.tempEvent) return;
        
        const timeline = document.getElementById('timeline');
        const timelineRect = timeline.getBoundingClientRect();
        
        // 计算相对于时间轴的位置（与时间指示器相同的计算方法）
        const relativePosition = (e.clientY - timelineRect.top) / timelineRect.height;
        const currentTime = relativePosition * 24;
        
        // 获取所有现有事件
        const events = eventService.getAllEvents();
        
        // 计算初始的开始和结束时间
        let startTime = Math.min(this.dragStartTime, currentTime);
        let endTime = Math.max(this.dragStartTime, currentTime);
        
        const formatTime = (hour) => {
            const h = Math.floor(Math.max(0, Math.min(23, hour)));
            const m = Math.floor((hour - Math.floor(hour)) * 60);
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        };

        // 将当前拖动的时间转换为时间字符串格式
        let formattedStartTime = formatTime(startTime);
        let formattedEndTime = formatTime(endTime);
        
        // 检查并调整时间以避免重叠
        events.forEach(event => {
            // 使用字符串比较来检查重叠
            if ((formattedStartTime < event.endTime && formattedEndTime > event.startTime)) {
                // 如果是向上拖动（endTime在eventStart附近）
                if (Math.abs(timeToDecimal(formattedEndTime) - timeToDecimal(event.startTime)) < 
                    Math.abs(timeToDecimal(formattedStartTime) - timeToDecimal(event.endTime))) {
                    // 直接使用事件的开始时间字符串
                    formattedEndTime = event.startTime;
                    endTime = timeToDecimal(event.startTime);
                }
                // 如果是向下拖动（startTime在eventEnd附近）
                else {
                    // 直接使用事件的结束时间字符串
                    formattedStartTime = event.endTime;
                    startTime = timeToDecimal(event.endTime);
                }
            }
        });
        
        // 更新临时事件的位置和大小
        const startPercent = (startTime / 24) * 100;
        const heightPercent = ((endTime - startTime) / 24) * 100;
        
        this.tempEvent.style.top = `${startPercent}%`;
        this.tempEvent.style.height = `${heightPercent}%`;
        
        // 如果事件时长小于阈值，添加short类
        if (Math.abs(endTime - startTime) < this.shortEventThreshold) {
            this.tempEvent.classList.add('short');
        } else {
            this.tempEvent.classList.remove('short');
        }
        
        // 保存调整后的时间字符串，供handleDragEnd使用
        this.adjustedStartTime = formattedStartTime;
        this.adjustedEndTime = formattedEndTime;
        
        this.tempEvent.textContent = `${formattedStartTime} - ${formattedEndTime}`;
    }

    // 创建自定义对话框
    createDialog(title, initialStartTime, initialEndTime, callback, defaultName = '') {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        
        // 从localStorage加载保存的颜色，如果没有则使用默认颜色
        const savedColors = JSON.parse(localStorage.getItem('predefinedColors')) || [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
        ];

        // 获取所有现有事件
        const events = eventService.getAllEvents();
        
        // 获取上一个事件的颜色
        let lastEventColor = null;
        if (events.length > 0) {
            lastEventColor = events[events.length - 1].color;
        }
        
        // 选择一个不同的颜色
        let selectedColorIndex = 0;
        if (lastEventColor) {
            // 找到不同于上一个事件的颜色
            selectedColorIndex = savedColors.findIndex((color, index) => {
                // 如果所有颜色都用完了，就回到第一个颜色
                if (index === savedColors.length - 1 && color === lastEventColor) {
                    return true;
                }
                return color !== lastEventColor;
            });
            // 如果找到的是最后一个颜色并且与上一个事件相同，就选择第一个颜色
            if (selectedColorIndex === savedColors.length - 1 && savedColors[selectedColorIndex] === lastEventColor) {
                selectedColorIndex = 0;
            }
        }
        
        dialog.innerHTML = `
            <h3>${title}</h3>
            <div class="dialog-form">
                <div class="form-group">
                    <label>事件名称:</label>
                    <input type="text" class="event-name" placeholder="请输入事件名称" value="${defaultName}" />
                </div>
                <div class="form-group">
                    <label>开始时间:</label>
                    <input type="time" class="start-time" value="${initialStartTime}" />
                </div>
                <div class="form-group">
                    <label>结束时间:</label>
                    <input type="time" class="end-time" value="${initialEndTime}" />
                </div>
                <div class="color-picker-grid">
                    ${savedColors.map((color, index) => `
                        <div class="color-box${index === selectedColorIndex ? ' selected' : ''}" 
                             style="background-color: ${color}" 
                             data-color="${color}">
                            <input type="color" value="${color}" />
                        </div>
                    `).join('')}
                </div>
                <div class="dialog-buttons">
                    <button class="cancel">取消</button>
                    <button class="confirm">确定</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const nameInput = dialog.querySelector('.event-name');
        const startTimeInput = dialog.querySelector('.start-time');
        const endTimeInput = dialog.querySelector('.end-time');
        nameInput.focus();
        
        let selectedColor = savedColors[selectedColorIndex];
        const colorBoxes = dialog.querySelectorAll('.color-box');
        
        // 处理颜色选择
        colorBoxes.forEach((box, index) => {
            // 单击选择颜色
            box.addEventListener('click', (e) => {
                if (e.target.classList.contains('color-box')) {
                    colorBoxes.forEach(b => b.classList.remove('selected'));
                    box.classList.add('selected');
                    selectedColor = box.dataset.color;
                }
            });
            
            // 双击显示颜色选择器
            box.addEventListener('dblclick', () => {
                const colorInput = box.querySelector('input[type="color"]');
                colorInput.style.display = 'block';
                colorInput.click();
                
                colorInput.addEventListener('change', (e) => {
                    const newColor = e.target.value;
                    box.style.backgroundColor = newColor;
                    box.dataset.color = newColor;
                    if (box.classList.contains('selected')) {
                        selectedColor = newColor;
                    }
                    colorInput.style.display = 'none';
                    
                    // 保存更新后的颜色到localStorage
                    savedColors[index] = newColor;
                    localStorage.setItem('predefinedColors', JSON.stringify(savedColors));
                });
            });
        });
        
        // 处理按钮点击
        dialog.querySelector('.confirm').addEventListener('click', () => {
            const name = nameInput.value.trim();
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;
            
            if (name && startTime && endTime) {
                callback(name, selectedColor, startTime, endTime);
            }
            document.body.removeChild(overlay);
        });
        
        dialog.querySelector('.cancel').addEventListener('click', () => {
            document.body.removeChild(overlay);
            this.isDragging = false;
            this.adjustedStartTime = null;
            this.adjustedEndTime = null;
            if (callback) callback(null);
        });
        
        // 处理按键事件
        nameInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const name = nameInput.value.trim();
                const startTime = startTimeInput.value;
                const endTime = endTimeInput.value;
                
                if (name && startTime && endTime) {
                    callback(name, selectedColor, startTime, endTime);
                    document.body.removeChild(overlay);
                }
            } else if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                this.isDragging = false;
                this.adjustedStartTime = null;
                this.adjustedEndTime = null;
                if (callback) callback(null);
            }
        });
    }

    handleDragEnd(e) {
        if (!this.isDragging || !this.tempEvent) return;
        
        const wasDragging = this.isDragging;
        
        // 清理拖拽状态
        this.isDragging = false;
        if (this.tempEvent) {
            this.tempEvent.remove();
            this.tempEvent = null;
        }
        
        // 如果没有实际进行拖拽，直接返回
        if (!wasDragging || !this.adjustedStartTime || !this.adjustedEndTime) {
            this.adjustedStartTime = null;
            this.adjustedEndTime = null;
            return;
        }
        
        // 使用调整后的时间字符串
        const formattedStartTime = this.adjustedStartTime;
        const formattedEndTime = this.adjustedEndTime;
        
        // 清理时间记录
        this.adjustedStartTime = null;
        this.adjustedEndTime = null;
        
        // 使用自定义对话框，新建事件时不传入默认名称
        this.createDialog('新建事件', formattedStartTime, formattedEndTime, (name, color, dialogStartTime, dialogEndTime) => {
            if (name) {
                const event = {
                    startTime: dialogStartTime || formattedStartTime,
                    endTime: dialogEndTime || formattedEndTime,
                    name,
                    color: color || '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
                };
                
                try {
                    eventService.addEvent(event);
                } catch (error) {
                    console.error('添加事件失败:', error);
                    alert(error.message);
                }
            }
        });
    }
}
