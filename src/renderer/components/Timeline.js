import { hourToPosition, timeToDecimal } from '../utils/timeUtils.js';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from '../utils/zoomUtils.js';
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

        // 添加清空按钮
        const eventList = document.querySelector('.event-list');
        if (eventList) {
            const header = document.createElement('div');
            header.className = 'event-list-header';
            header.innerHTML = `
                <h2>事件列表</h2>
                <button class="clear-all-btn">清空所有事件</button>
            `;
            
            // 将header插入到eventList的最前面
            eventList.insertBefore(header, eventList.firstChild);
            
            // 添加清空按钮的点击事件
            const clearBtn = header.querySelector('.clear-all-btn');
            clearBtn.addEventListener('click', () => {
                this.createConfirmDialog('确定要清空所有事件吗？', () => {
                    eventService.clearAllEvents();
                });
            });
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

        // 创建日期选择按钮
        const datePickerButton = document.createElement('button');
        datePickerButton.className = 'date-picker-toggle';
        datePickerButton.innerHTML = `<i>📅</i>`;
        document.body.appendChild(datePickerButton);

        // 添加点击事件
        datePickerButton.addEventListener('click', () => {
            this.showDatePicker();
        });
    }

    // 显示日期选择器
    showDatePicker() {
        const currentDate = new Date();
        this.createDatePickerDialog(currentDate);
    }

    // 创建日期选择器对话框
    createDatePickerDialog(date) {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog date-picker-dialog';
        
        // 获取当前年月
        const year = date.getFullYear();
        const month = date.getMonth();
        
        dialog.innerHTML = `
            <div class="date-picker-header">
                <div class="month-selector">
                    <button class="prev-month">◀</button>
                    <span class="current-month">${year}年${month + 1}月</span>
                    <button class="next-month">▶</button>
                </div>
            </div>
            <div class="calendar-grid">
                <div class="weekday-header">
                    <div>日</div>
                    <div>一</div>
                    <div>二</div>
                    <div>三</div>
                    <div>四</div>
                    <div>五</div>
                    <div>六</div>
                </div>
                <div class="days-grid">
                    ${this.generateCalendarDays(year, month)}
                </div>
            </div>
            <div class="dialog-buttons">
                <button class="cancel">关闭</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 添加事件监听
        const prevMonthBtn = dialog.querySelector('.prev-month');
        const nextMonthBtn = dialog.querySelector('.next-month');
        const cancelBtn = dialog.querySelector('.cancel');
        
        prevMonthBtn.addEventListener('click', () => {
            const newDate = new Date(year, month - 1, 1);
            document.body.removeChild(overlay);
            this.createDatePickerDialog(newDate);
        });
        
        nextMonthBtn.addEventListener('click', () => {
            const newDate = new Date(year, month + 1, 1);
            document.body.removeChild(overlay);
            this.createDatePickerDialog(newDate);
        });
        
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // 为每个日期添加点击事件
        const dayButtons = dialog.querySelectorAll('.calendar-day');
        dayButtons.forEach(button => {
            button.addEventListener('click', () => {
                const selectedDate = button.getAttribute('data-date');
                console.log('选择的日期:', selectedDate);
                // 这里后续添加日期选择的处理逻辑
            });
        });
        
        // ESC键关闭对话框
        document.addEventListener('keyup', function handleEsc(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keyup', handleEsc);
            }
        });
    }
    
    // 生成日历天数
    generateCalendarDays(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        let html = '';
        let dayCount = 1;
        
        // 始终生成6行7列的日历网格
        for (let i = 0; i < 6; i++) {
            html += '<div class="calendar-row">';
            for (let j = 0; j < 7; j++) {
                if ((i === 0 && j < startDay) || dayCount > totalDays) {
                    // 添加空白格子
                    html += '<div class="calendar-day empty"></div>';
                } else if (dayCount <= totalDays) {
                    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`;
                    html += `
                        <div class="calendar-day" data-date="${date}">
                            <span class="day-number">${dayCount}</span>
                        </div>
                    `;
                    dayCount++;
                }
            }
            html += '</div>';
        }
        
        return html;
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

    // 添加动画辅助函数
    animate(startValue, endValue, duration, onUpdate, onComplete) {
        const startTime = performance.now();
        
        const tick = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // 使用easeOutQuad缓动函数使动画更自然
            const easeProgress = 1 - (1 - progress) * (1 - progress);
            
            const currentValue = startValue + (endValue - startValue) * easeProgress;
            onUpdate(currentValue);
            
            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                if (onComplete) onComplete();
            }
        };
        
        requestAnimationFrame(tick);
    }

    handleZoom(event) {
        if (event.ctrlKey) {
            event.preventDefault();
            
            // 获取当前鼠标位置相对于容器的位置
            const rect = this.container.getBoundingClientRect();
            const mouseY = event.clientY - rect.top;
            
            // 计算鼠标位置对应的时间点的比例
            const mouseRatio = (mouseY + this.container.scrollTop) / this.content.offsetHeight;
            
            // 确定滚动方向
            const delta = event.deltaY < 0 ? 1 : -1;
            const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.zoomLevel + (delta * ZOOM_STEP)));
            
            if (newZoom !== this.zoomLevel) {
                // 移除任何可能存在的过渡效果
                this.content.style.transition = 'none';
                
                // 保存当前状态
                const startHeight = this.content.offsetHeight;
                const startScrollTop = this.container.scrollTop;
                const endHeight = this.container.offsetHeight * newZoom;
                const endScrollTop = (mouseRatio * endHeight) - mouseY;
                
                // 更新缩放级别
                this.zoomLevel = newZoom;
                
                // 使用requestAnimationFrame实现平滑动画
                let animationStartTime = null;
                const duration = 150; // 动画持续时间（毫秒）
                
                const animate = (currentTime) => {
                    if (!animationStartTime) animationStartTime = currentTime;
                    const elapsed = currentTime - animationStartTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // 使用easeOutQuad缓动函数
                    const easeProgress = 1 - Math.pow(1 - progress, 2);
                    
                    // 同步更新高度和滚动位置
                    const currentHeight = startHeight + (endHeight - startHeight) * easeProgress;
                    const currentScrollTop = startScrollTop + (endScrollTop - startScrollTop) * easeProgress;
                    
                    this.content.style.height = `${currentHeight}px`;
                    this.container.scrollTop = currentScrollTop;
                    
                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        // 动画完成后更新时间轴和事件
                        this.updateTimelineHeight();
                        this.renderEvents();
                    }
                };
                
                requestAnimationFrame(animate);
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

    // 创建错误提示对话框
    createAlertDialog(message) {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog alert-dialog';
        
        dialog.innerHTML = `
            <div class="dialog-content">
                <p>${message}</p>
                <div class="dialog-buttons">
                    <button class="confirm">确定</button>
                </div>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // 处理确定按钮点击
        const handleConfirm = () => {
            document.body.removeChild(overlay);
        };
        
        dialog.querySelector('.confirm').addEventListener('click', handleConfirm);
        
        // 处理回车键和ESC键
        dialog.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === 'Escape') && !e.isComposing) {
                e.preventDefault();
                handleConfirm();
            }
        });
        
        // 自动聚焦到确定按钮
        setTimeout(() => {
            dialog.querySelector('.confirm').focus();
        }, 0);
    }

    // 编辑事件的方法
    editEvent(event, index) {
        // 计算浪费时间的百分比
        const startTimeDecimal = timeToDecimal(event.startTime);
        const endTimeDecimal = timeToDecimal(event.endTime);
        const totalMinutes = (endTimeDecimal - startTimeDecimal) * 60;
        const wastedTimePercent = Math.round((event.wastedTime / totalMinutes) * 100) || 0;

        this.createDialog('编辑事件', event.startTime, event.endTime, (name, color, dialogStartTime, dialogEndTime, wastedTime) => {
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
                    // 先从eventService中删除原事件
                    eventService.deleteEvent(index);
                    
                    // 再添加更新后的事件
                    eventService.addEvent(updatedEvent);
                    
                } catch (error) {
                    console.error('更新事件失败:', error);
                    this.createAlertDialog(error.message);
                    // 如果更新失败，恢复原事件
                    try {
                        eventService.addEvent(event);
                    } catch (restoreError) {
                        console.error('恢复原事件失败:', restoreError);
                        this.createAlertDialog('更新失败，且无法恢复原事件，请刷新页面。');
                    }
                }
            }
        }, event.name, event.color, wastedTimePercent); // 传入百分比而不是分钟数
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
    createDialog(title, initialStartTime, initialEndTime, callback, defaultName = '', defaultColor = null, defaultWastedTime = 0) {
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
        
        // 选择默认颜色
        let selectedColorIndex = 0;
        if (defaultColor) {
            // 如果有默认颜色（编辑模式），使用该颜色
            selectedColorIndex = savedColors.findIndex(color => color === defaultColor);
            if (selectedColorIndex === -1) {
                // 如果默认颜色不在预设颜色中，添加到预设颜色列表
                savedColors.push(defaultColor);
                selectedColorIndex = savedColors.length - 1;
                localStorage.setItem('predefinedColors', JSON.stringify(savedColors));
            }
        } else {
            // 如果是新建事件，选择一个不同于上一个事件的颜色
            const lastEventColor = events.length > 0 ? events[events.length - 1].color : null;
            if (lastEventColor) {
                selectedColorIndex = savedColors.findIndex((color, index) => {
                    if (index === savedColors.length - 1 && color === lastEventColor) {
                        return true;
                    }
                    return color !== lastEventColor;
                });
                if (selectedColorIndex === savedColors.length - 1 && savedColors[selectedColorIndex] === lastEventColor) {
                    selectedColorIndex = 0;
                }
            }
        }
        
        dialog.innerHTML = `
            <style>
                .wasted-time-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .wasted-minutes-display {
                    color: #666;
                    font-size: 0.9em;
                }
            </style>
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
                <div class="form-group">
                    <label>浪费的时间(%):</label>
                    <div class="wasted-time-container">
                        <input type="number" class="wasted-time" min="0" max="100" value="${defaultWastedTime}" />
                        <span class="wasted-minutes-display"></span>
                    </div>
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
        const wastedTimeInput = dialog.querySelector('.wasted-time');
        const wastedMinutesDisplay = dialog.querySelector('.wasted-minutes-display');
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
        
        // 计算并显示浪费的分钟数
        const updateWastedMinutes = () => {
            const startTimeDecimal = timeToDecimal(startTimeInput.value);
            const endTimeDecimal = timeToDecimal(endTimeInput.value);
            const totalMinutes = (endTimeDecimal - startTimeDecimal) * 60;
            const wastedPercent = parseInt(wastedTimeInput.value) || 0;
            const wastedMinutes = Math.round((wastedPercent / 100) * totalMinutes);
            wastedMinutesDisplay.textContent = `(${wastedMinutes}分钟)`;
        };

        // 添加事件监听器
        wastedTimeInput.addEventListener('input', updateWastedMinutes);
        startTimeInput.addEventListener('change', updateWastedMinutes);
        endTimeInput.addEventListener('change', updateWastedMinutes);

        // 初始化显示
        updateWastedMinutes();
        
        // 处理确认操作
        const handleConfirm = () => {
            const name = nameInput.value.trim();
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;
            const wastedTime = parseInt(wastedTimeInput.value) || 0;
            
            if (name && startTime && endTime) {
                // 计算实际浪费的分钟数
                const startTimeDecimal = timeToDecimal(startTime);
                const endTimeDecimal = timeToDecimal(endTime);
                const totalMinutes = (endTimeDecimal - startTimeDecimal) * 60;
                const actualWastedMinutes = Math.round((wastedTime / 100) * totalMinutes);
                
                callback(name, selectedColor, startTime, endTime, actualWastedMinutes);
                document.body.removeChild(overlay);
            } else {
                // 如果缺少必要信息，聚焦到第一个空的输入框
                if (!name) nameInput.focus();
                else if (!startTime) startTimeInput.focus();
                else if (!endTime) endTimeInput.focus();
            }
        };
        
        // 处理取消操作
        const handleCancel = () => {
            document.body.removeChild(overlay);
            this.isDragging = false;
            this.adjustedStartTime = null;
            this.adjustedEndTime = null;
            if (callback) callback(null);
        };
        
        // 处理按钮点击
        dialog.querySelector('.confirm').addEventListener('click', handleConfirm);
        dialog.querySelector('.cancel').addEventListener('click', handleCancel);
        
        // 处理对话框内的所有按键事件
        dialog.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault(); // 止表单提交
                handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        });
        
        // 防止事件冒泡到document
        dialog.addEventListener('keyup', (e) => {
            e.stopPropagation();
        });
        
        // 自动聚焦到名称输入框
        setTimeout(() => {
            nameInput.focus();
        }, 0);
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
        
        // 使用自定义对话框，新建事件时不传入默认名称和颜色
        this.createDialog('新建事件', formattedStartTime, formattedEndTime, (name, color, dialogStartTime, dialogEndTime, wastedTime) => {
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
                    this.createAlertDialog(error.message);
                }
            }
        }, '', null, 0);
    }
}
