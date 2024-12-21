import { eventService } from '../services/eventService.js';

export class EventForm {
    constructor() {
        this.form = document.getElementById('eventForm');
        this.bindEvents();
    }

    bindEvents() {
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    handleSubmit(e) {
        e.preventDefault();
        
        try {
            const event = {
                startTime: document.getElementById('startTime').value,
                endTime: document.getElementById('endTime').value,
                name: document.getElementById('eventName').value,
                color: document.getElementById('eventColor').value
            };
            
            eventService.addEvent(event);
            this.form.reset();
        } catch (error) {
            alert(error.message);
        }
    }
}
