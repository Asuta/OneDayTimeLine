import { timeToDecimal } from '../utils/timeUtils.js';
import { eventService } from '../services/eventService.js';

export class TimelineDialog {
    constructor(timeline) {
        this.timeline = timeline;
    }

    // 获取与指定时间相邻的上一个事件的颜色
    getPreviousEventColor(startTime) {
        // 获取选定日期的事件
        const selectedDate = eventService.getSelectedDate();
        const todayEvents = eventService.getEventsByDate(selectedDate);
        
        // 按开始时间排序
        todayEvents.sort((a, b) => timeToDecimal(a.startTime) - timeToDecimal(b.startTime));
        
        // 找到紧邻的上一个事件
        const startTimeDecimal = timeToDecimal(startTime);
        const previousEvent = todayEvents.reverse().find(event => timeToDecimal(event.startTime) < startTimeDecimal);
        
        return previousEvent ? previousEvent.color : null;
    }

    // 从预定义颜色中获取一个不同的颜色
    getDifferentColor(savedColors, previousColor) {
        if (!previousColor) return savedColors[0];
        
        // 找到第一个与上一个事件颜色不同的颜色
        const differentColor = savedColors.find(color => color !== previousColor);
        return differentColor || savedColors[0];
    }

    createDialog(title, initialStartTime, initialEndTime, callback, defaultName = '', defaultColor = null, defaultWastedTime = 0) {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        
        const savedColors = JSON.parse(localStorage.getItem('predefinedColors')) || [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
            '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
        ];

        // 获取上一个事件的颜色
        const previousEventColor = this.getPreviousEventColor(initialStartTime);
        
        // 如果没有指定默认颜色，则选择一个与上一个事件不同的颜色
        if (!defaultColor) {
            defaultColor = this.getDifferentColor(savedColors, previousEventColor);
        }

        let selectedColorIndex = this.getSelectedColorIndex(savedColors, defaultColor);
        
        dialog.innerHTML = this.getDialogHTML(title, defaultName, initialStartTime, initialEndTime, defaultWastedTime, savedColors, selectedColorIndex);
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        this.setupDialogEventListeners(dialog, overlay, savedColors, callback, defaultColor || savedColors[selectedColorIndex]);
    }

    getSelectedColorIndex(savedColors, defaultColor) {
        if (defaultColor) {
            const index = savedColors.findIndex(color => color === defaultColor);
            if (index === -1) {
                savedColors.push(defaultColor);
                localStorage.setItem('predefinedColors', JSON.stringify(savedColors));
                return savedColors.length - 1;
            }
            return index;
        }
        return 0;
    }

    getDialogHTML(title, defaultName, initialStartTime, initialEndTime, defaultWastedTime, savedColors, selectedColorIndex) {
        return `
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
                .color-picker-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                    margin: 10px 0;
                    padding: 10px;
                }
                .color-box {
                    width: 40px;
                    height: 40px;
                    border-radius: 4px;
                    cursor: pointer;
                    position: relative;
                    border: 2px solid transparent;
                    transition: transform 0.2s;
                }
                .color-box:hover {
                    transform: scale(1.1);
                }
                .color-box.selected {
                    border: 2px solid #fff;
                    box-shadow: 0 0 0 2px #000;
                }
                .color-box input[type="color"] {
                    opacity: 0;
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    left: 0;
                    top: 0;
                    cursor: pointer;
                    display: none;
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
                <div class="form-group">
                    <label>事件颜色:</label>
                    <div class="color-picker-grid">
                        ${savedColors.map((color, index) => `
                            <div class="color-box${index === selectedColorIndex ? ' selected' : ''}" 
                                style="background-color: ${color}" 
                                data-color="${color}">
                                <input type="color" value="${color}" />
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="dialog-buttons">
                    <button class="cancel">取消</button>
                    <button class="confirm">确定</button>
                </div>
            </div>
        `;
    }

    setupDialogEventListeners(dialog, overlay, savedColors, callback, initialColor) {
        const nameInput = dialog.querySelector('.event-name');
        const startTimeInput = dialog.querySelector('.start-time');
        const endTimeInput = dialog.querySelector('.end-time');
        const wastedTimeInput = dialog.querySelector('.wasted-time');
        const wastedMinutesDisplay = dialog.querySelector('.wasted-minutes-display');
        
        let selectedColor = initialColor;
        
        // 设置颜色选择器，但不重新绑定按钮事件
        this.setupColorPicker(dialog, savedColors, (color) => {
            selectedColor = color;
        });
        
        this.setupWastedTimeCalculation(startTimeInput, endTimeInput, wastedTimeInput, wastedMinutesDisplay);
        
        // 只绑定一次按钮事件
        const confirmButton = dialog.querySelector('.confirm');
        const cancelButton = dialog.querySelector('.cancel');
        
        const handleConfirm = () => {
            const name = nameInput.value.trim();
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;
            const wastedTime = parseInt(wastedTimeInput.value) || 0;
            
            if (name && startTime && endTime) {
                const startTimeDecimal = timeToDecimal(startTime);
                const endTimeDecimal = timeToDecimal(endTime);
                const totalMinutes = (endTimeDecimal - startTimeDecimal) * 60;
                const actualWastedMinutes = Math.round((wastedTime / 100) * totalMinutes);
                
                callback(name, selectedColor, startTime, endTime, actualWastedMinutes);
                document.body.removeChild(overlay);
            } else {
                if (!name) nameInput.focus();
            }
        };
        
        const handleCancel = () => {
            document.body.removeChild(overlay);
        };
        
        confirmButton.addEventListener('click', handleConfirm);
        cancelButton.addEventListener('click', handleCancel);
        
        // 添加键盘事件监听
        dialog.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') handleCancel();
        });
    }

    setupColorPicker(dialog, savedColors, onColorSelect) {
        const colorBoxes = dialog.querySelectorAll('.color-box');
        colorBoxes.forEach((box, index) => {
            const handleColorSelect = () => {
                colorBoxes.forEach(b => b.classList.remove('selected'));
                box.classList.add('selected');
                const color = box.dataset.color;
                onColorSelect(color);
            };

            // 点击选择颜色
            box.addEventListener('click', () => {
                handleColorSelect();
            });
            
            // 双击自定义颜色
            box.addEventListener('dblclick', () => {
                const colorInput = box.querySelector('input[type="color"]');
                colorInput.style.display = 'block';
                colorInput.click();
                
                colorInput.addEventListener('change', (e) => {
                    const newColor = e.target.value;
                    box.style.backgroundColor = newColor;
                    box.dataset.color = newColor;
                    colorInput.style.display = 'none';
                    
                    savedColors[index] = newColor;
                    localStorage.setItem('predefinedColors', JSON.stringify(savedColors));
                    
                    handleColorSelect();
                });
            });
        });
    }

    setupWastedTimeCalculation(startTimeInput, endTimeInput, wastedTimeInput, wastedMinutesDisplay) {
        const updateWastedMinutes = () => {
            const startTimeDecimal = timeToDecimal(startTimeInput.value);
            const endTimeDecimal = timeToDecimal(endTimeInput.value);
            const totalMinutes = (endTimeDecimal - startTimeDecimal) * 60;
            const wastedPercent = parseInt(wastedTimeInput.value) || 0;
            const wastedMinutes = Math.round((wastedPercent / 100) * totalMinutes);
            wastedMinutesDisplay.textContent = `(${wastedMinutes}分钟)`;
        };

        wastedTimeInput.addEventListener('input', updateWastedMinutes);
        startTimeInput.addEventListener('change', updateWastedMinutes);
        endTimeInput.addEventListener('change', updateWastedMinutes);
        updateWastedMinutes();
    }

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
        
        const handleConfirm = () => {
            document.body.removeChild(overlay);
            if (onConfirm) onConfirm();
        };
        
        const handleCancel = () => {
            document.body.removeChild(overlay);
        };
        
        dialog.querySelector('.confirm').addEventListener('click', handleConfirm);
        dialog.querySelector('.cancel').addEventListener('click', handleCancel);
        
        document.addEventListener('keyup', function handleEsc(e) {
            if (e.key === 'Escape') {
                handleCancel();
                document.removeEventListener('keyup', handleEsc);
            }
        });
    }

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
        
        const handleConfirm = () => {
            document.body.removeChild(overlay);
        };
        
        dialog.querySelector('.confirm').addEventListener('click', handleConfirm);
        
        dialog.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.key === 'Escape') && !e.isComposing) {
                e.preventDefault();
                handleConfirm();
            }
        });
        
        setTimeout(() => {
            dialog.querySelector('.confirm').focus();
        }, 0);
    }
} 