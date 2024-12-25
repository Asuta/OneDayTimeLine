export class TimelineTheme {
    constructor(timeline) {
        this.timeline = timeline;
        this.isDarkMode = localStorage.getItem('darkMode') === 'true';
        this.initializeThemeToggle();
    }

    initializeThemeToggle() {
        const themeToggle = document.createElement('button');
        themeToggle.className = 'theme-toggle';
        themeToggle.innerHTML = `<i>${this.isDarkMode ? '☀️' : '🌙'}</i>`;
        document.body.appendChild(themeToggle);

        themeToggle.addEventListener('click', () => {
            this.isDarkMode = !this.isDarkMode;
            document.body.classList.toggle('dark-mode');
            themeToggle.innerHTML = `<i>${this.isDarkMode ? '☀️' : '🌙'}</i>`;
            localStorage.setItem('darkMode', this.isDarkMode);
        });

        const datePickerButton = document.createElement('button');
        datePickerButton.className = 'date-picker-toggle';
        datePickerButton.innerHTML = `<i>📅</i>`;
        document.body.appendChild(datePickerButton);

        datePickerButton.addEventListener('click', () => {
            this.showDatePicker();
        });

        // 应用初始主题
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
        }
    }

    showDatePicker() {
        const currentDate = new Date();
        this.createDatePickerDialog(currentDate);
    }

    createDatePickerDialog(date) {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'dialog date-picker-dialog';
        
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
        
        this.setupDatePickerEventListeners(dialog, overlay, year, month);
    }

    generateCalendarDays(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDay = firstDay.getDay();
        const totalDays = lastDay.getDate();
        
        let html = '';
        let dayCount = 1;
        
        for (let i = 0; i < 6; i++) {
            html += '<div class="calendar-row">';
            for (let j = 0; j < 7; j++) {
                if ((i === 0 && j < startDay) || dayCount > totalDays) {
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

    setupDatePickerEventListeners(dialog, overlay, year, month) {
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
        
        const dayButtons = dialog.querySelectorAll('.calendar-day');
        dayButtons.forEach(button => {
            button.addEventListener('click', () => {
                const selectedDate = button.getAttribute('data-date');
                console.log('选择的日期:', selectedDate);
                // 这里后续添加日期选择的处理逻辑
            });
        });
        
        document.addEventListener('keyup', function handleEsc(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keyup', handleEsc);
            }
        });
    }
}
