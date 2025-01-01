import { eventService } from '../services/eventService.js';

export class Calendar {
    constructor() {
        this.container = document.querySelector('.calendar-container');
        this.currentDate = new Date();
        this.initialize();
    }

    initialize() {
        // 确保在初始化时就显示正确的选中状态
        const selectedDate = eventService.getSelectedDate();
        const [year, month] = selectedDate.split('-').map(Number);
        this.currentDate.setFullYear(year);
        this.currentDate.setMonth(month - 1);
        
        this.updateCalendar();
        this.setupEventListeners();
    }

    updateCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // 更新月份显示
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
        const currentMonthElement = this.container.querySelector('.current-month');
        currentMonthElement.textContent = `${year}年 ${monthNames[month]}`;

        // 生成日历天数
        const daysGrid = this.container.querySelector('.days-grid');
        daysGrid.innerHTML = this.generateCalendarDays(year, month);
    }

    generateCalendarDays(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        let html = '';
        let dayCount = 1;
        
        // 获取当前选定的日期
        const selectedDate = eventService.getSelectedDate();
        const [selectedYear, selectedMonth, selectedDay] = selectedDate.split('-').map(Number);
        
        for (let i = 0; i < 6; i++) {
            html += '<div class="calendar-row">';
            for (let j = 0; j < 7; j++) {
                if (i === 0 && j < startDay) {
                    html += '<div class="calendar-day empty"></div>';
                } else if (dayCount <= totalDays) {
                    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`;
                    const isSelected = year === selectedYear && 
                                    (month + 1) === selectedMonth && 
                                    dayCount === selectedDay;
                    
                    html += `
                        <div class="calendar-day${isSelected ? ' selected' : ''}" data-date="${date}">
                            <span class="day-number">${dayCount}</span>
                        </div>
                    `;
                    dayCount++;
                } else {
                    html += '<div class="calendar-day empty"></div>';
                }
            }
            html += '</div>';
            
            // 如果已经生成完所有天数，提前结束循环
            if (dayCount > totalDays) break;
        }
        
        return html;
    }

    setupEventListeners() {
        // 上一月按钮
        const prevMonthBtn = this.container.querySelector('.prev-month');
        prevMonthBtn.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.updateCalendar();
        });

        // 下一月按钮
        const nextMonthBtn = this.container.querySelector('.next-month');
        nextMonthBtn.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.updateCalendar();
        });

        // 日期选择
        this.container.addEventListener('click', (e) => {
            const dayElement = e.target.closest('.calendar-day');
            if (dayElement && !dayElement.classList.contains('empty')) {
                const selectedDate = dayElement.getAttribute('data-date');
                
                // 先更新服务中的选中日期
                eventService.setSelectedDate(selectedDate);
                
                // 然后重新生成日历以显示正确的选中状态
                this.updateCalendar();
            }
        });

        // 监听日期变化
        eventService.addListener(() => {
            this.updateCalendar();
        });
    }
} 