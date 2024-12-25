import { timeToDecimal } from '../utils/timeUtils.js';

export class TimelineDialog {
    constructor(timeline) {
        this.timeline = timeline;
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

        let selectedColorIndex = this.getSelectedColorIndex(savedColors, defaultColor);
        
        dialog.innerHTML = this.getDialogHTML(title, defaultName, initialStartTime, initialEndTime, defaultWastedTime, savedColors, selectedColorIndex);
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        this.setupDialogEventListeners(dialog, overlay, savedColors, callback);
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
    }

    setupDialogEventListeners(dialog, overlay, savedColors, callback) {
        const nameInput = dialog.querySelector('.event-name');
        const startTimeInput = dialog.querySelector('.start-time');
        const endTimeInput = dialog.querySelector('.end-time');
        const wastedTimeInput = dialog.querySelector('.wasted-time');
        const wastedMinutesDisplay = dialog.querySelector('.wasted-minutes-display');
        
        let selectedColor = savedColors[0];
        
        this.setupColorPicker(dialog, savedColors, color => selectedColor = color);
        this.setupWastedTimeCalculation(startTimeInput, endTimeInput, wastedTimeInput, wastedMinutesDisplay);
        this.setupDialogButtons(dialog, overlay, nameInput, startTimeInput, endTimeInput, wastedTimeInput, selectedColor, callback);
    }

    setupColorPicker(dialog, savedColors, onColorSelect) {
        const colorBoxes = dialog.querySelectorAll('.color-box');
        colorBoxes.forEach((box, index) => {
            box.addEventListener('click', (e) => {
                if (e.target.classList.contains('color-box')) {
                    colorBoxes.forEach(b => b.classList.remove('selected'));
                    box.classList.add('selected');
                    onColorSelect(box.dataset.color);
                }
            });
            
            box.addEventListener('dblclick', () => {
                const colorInput = box.querySelector('input[type="color"]');
                colorInput.style.display = 'block';
                colorInput.click();
                
                colorInput.addEventListener('change', (e) => {
                    const newColor = e.target.value;
                    box.style.backgroundColor = newColor;
                    box.dataset.color = newColor;
                    if (box.classList.contains('selected')) {
                        onColorSelect(newColor);
                    }
                    colorInput.style.display = 'none';
                    
                    savedColors[index] = newColor;
                    localStorage.setItem('predefinedColors', JSON.stringify(savedColors));
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

    setupDialogButtons(dialog, overlay, nameInput, startTimeInput, endTimeInput, wastedTimeInput, selectedColor, callback) {
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
                else if (!startTime) startTimeInput.focus();
                else if (!endTime) endTimeInput.focus();
            }
        };
        
        const handleCancel = () => {
            document.body.removeChild(overlay);
            if (callback) callback(null);
        };
        
        dialog.querySelector('.confirm').addEventListener('click', handleConfirm);
        dialog.querySelector('.cancel').addEventListener('click', handleCancel);
        
        dialog.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        });
        
        dialog.addEventListener('keyup', e => e.stopPropagation());
        
        setTimeout(() => nameInput.focus(), 0);
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