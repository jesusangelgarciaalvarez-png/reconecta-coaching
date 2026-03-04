import {
    manageUser,
    createAppointment,
    getMonthlyAvailability,
    getOccupiedSlots
} from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('--- RECONECTA BOOKING ENGINE v4.0 (REBUILD) ---');

    // DOM Elements
    const elements = {
        calendarGrid: document.getElementById('calendar-grid'),
        timeSlotsContainer: document.getElementById('time-slots-container'),
        currentMonthDisplay: document.getElementById('current-month-year'),
        confirmBtn: document.getElementById('confirm-booking'),
        errorMsg: document.getElementById('error-message'),
        nameInput: document.getElementById('user-name'),
        emailInput: document.getElementById('user-email'),
        phoneInput: document.getElementById('user-phone'),
        timeSection: document.getElementById('time-section'),
        formSection: document.getElementById('form-section'),
        prevMonthBtn: document.getElementById('prev-month'),
        nextMonthBtn: document.getElementById('next-month')
    };

    // Validation
    const missing = Object.entries(elements).filter(([k, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
        console.error('Missing DOM elements:', missing);
        return;
    }

    // State
    const now = new Date();
    let currentViewDate = new Date(now);
    let selectedDate = null;
    let selectedTime = null;
    let monthlyStatsCache = {};

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    /**
     * Initializes the calendar with stats
     */
    async function initCalendar() {
        renderCalendarShell();

        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const cacheKey = `${year}-${month}`;

        if (monthlyStatsCache[cacheKey]) {
            renderCalendarShell();
            return;
        }

        try {
            // Background fetch with a "Cargando..." placeholder in shell
            const statsPromise = getMonthlyAvailability(year, month);

            // Timeout after 8s to prevent total site hang if Firebase/Network is slow
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000));

            const stats = await Promise.race([statsPromise, timeout]);
            monthlyStatsCache[cacheKey] = stats;
            renderCalendarShell();
        } catch (e) {
            console.warn("Could not load availability indicators, proceeding with basic UI", e);
            monthlyStatsCache[cacheKey] = {}; // Fallback empty
            renderCalendarShell();
        }
    }

    function renderCalendarShell() {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        elements.currentMonthDisplay.textContent = `${monthNames[month]} ${year}`;
        elements.calendarGrid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Adjust empty slots for Monday-start (JS: 0=Sun, 6=Sat)
        let startOffset = firstDay === 0 ? 6 : firstDay - 1;

        for (let i = 0; i < startOffset; i++) {
            elements.calendarGrid.appendChild(document.createElement('div'));
        }

        const cacheKey = `${year}-${month}`;
        const stats = monthlyStatsCache[cacheKey] || {};

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const isPast = date < today;
            const isSelected = selectedDate === dateStr;

            const btn = document.createElement('button');
            btn.className = `h-12 w-full rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center relative border border-transparent `;

            if (isWeekend || isPast) {
                btn.className += "opacity-20 cursor-not-allowed text-slate-500 scale-90";
                btn.textContent = day;
            } else {
                btn.className += isSelected ? "v-grid-day-active shadow-lg" : "text-white hover:bg-white/5 border-white/5";
                btn.innerHTML = `<span>${day}</span>`;

                // Availability Dot
                const count = stats[dateStr] || 0;
                const dot = document.createElement('span');

                // 9 slots total (9am to 5pm starting times)
                let colorClass = 'bg-green-500';
                if (count >= 9) colorClass = 'bg-red-500 shadow-[0_0_8px_red]';
                else if (count > 0) colorClass = 'bg-yellow-500';

                dot.className = `w-1.5 h-1.5 rounded-full mt-1.5 ${colorClass} transition-colors`;
                if (!isSelected) btn.appendChild(dot);

                btn.onclick = (e) => {
                    e.preventDefault();
                    if (count >= 9) return;
                    selectedDate = dateStr;
                    selectedTime = null;
                    renderCalendarShell();
                    loadTimeSlots(dateStr);
                };
            }
            elements.calendarGrid.appendChild(btn);
        }
    }

    async function loadTimeSlots(dateStr) {
        elements.timeSection.classList.remove('hidden');
        elements.timeSlotsContainer.innerHTML = '<div class="col-span-3 text-center text-slate-500 py-10 text-xs italic loading-dot">Consultando horarios disponibles...</div>';

        // Hide form while slot selection is pending
        elements.formSection.classList.add('hidden');

        try {
            const occupied = await getOccupiedSlots(dateStr);
            elements.timeSlotsContainer.innerHTML = '';

            const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
            hours.forEach(h => {
                const time = `${h.toString().padStart(2, '0')}:00`;
                const isTaken = occupied.includes(time);

                const btn = document.createElement('button');
                btn.className = `p-4 rounded-xl text-xs font-bold transition-all border ${isTaken ? 'opacity-20 cursor-not-allowed border-transparent' : 'glass-panel hover:bg-primary/20 hover:border-primary/50 text-white border-white/10'}`;

                if (selectedTime === time) btn.classList.add('time-slot-selected');

                btn.innerHTML = `<span>${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}</span>`;

                if (!isTaken) {
                    btn.onclick = () => {
                        selectedTime = time;
                        document.querySelectorAll('#time-slots-container button').forEach(b => b.classList.remove('time-slot-selected'));
                        btn.classList.add('time-slot-selected');
                        elements.formSection.classList.remove('hidden');

                        // Scroll to form smoothly
                        elements.formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    };
                } else {
                    btn.disabled = true;
                }
                elements.timeSlotsContainer.appendChild(btn);
            });
        } catch (err) {
            elements.timeSlotsContainer.innerHTML = '<div class="col-span-3 text-center text-red-400 py-6 text-xs">Ocurrió un error al cargar. Por favor intenta de nuevo.</div>';
        }
    }

    // Navigation Events
    elements.prevMonthBtn.onclick = (e) => {
        e.preventDefault();
        currentViewDate.setMonth(currentViewDate.getMonth() - 1);
        initCalendar();
    };

    elements.nextMonthBtn.onclick = (e) => {
        e.preventDefault();
        currentViewDate.setMonth(currentViewDate.getMonth() + 1);
        initCalendar();
    };

    // Confirm Booking
    elements.confirmBtn.onclick = async () => {
        const name = elements.nameInput.value.trim();
        const email = elements.emailInput.value.trim();
        const phone = elements.phoneInput.value.trim();

        if (!name || !email || !phone || !selectedDate || !selectedTime) {
            elements.errorMsg.textContent = "Por favor completa todos tus datos y selecciona fecha y hora.";
            elements.errorMsg.classList.remove('hidden');
            return;
        }

        elements.errorMsg.classList.add('hidden');
        elements.confirmBtn.disabled = true;
        elements.confirmBtn.textContent = "AGENDANDO...";

        try {
            const userResult = await manageUser(phone, { name, email });
            const appointmentId = Math.floor(100000 + Math.random() * 900000).toString();
            const meetLink = `https://meet.google.com/hbm-pivc-mvy`;

            const bookingData = {
                id: appointmentId,
                name,
                email,
                phone: phone.replace(/\D/g, ''),
                date: selectedDate,
                time: selectedTime,
                timestamp: new Date(`${selectedDate}T${selectedTime}`).getTime(),
                meetLink,
                isFree: userResult.isFirstTime,
                build: 'v4.0-REBUILD'
            };

            await createAppointment(bookingData);
            sessionStorage.setItem('lastBooking', JSON.stringify(bookingData));
            window.location.href = '/success.html';
        } catch (err) {
            console.error("Booking failed:", err);
            elements.confirmBtn.disabled = false;
            elements.confirmBtn.textContent = "Confirmar Reserva";
            elements.errorMsg.textContent = "Hubo un problema. Por favor intenta de nuevo en unos segundos.";
            elements.errorMsg.classList.remove('hidden');
        }
    };

    // Modern Phone Formatter
    if (elements.phoneInput) {
        elements.phoneInput.addEventListener('input', (e) => {
            let input = e.target.value.replace(/\D/g, '');
            let formatted = '';
            if (input.length > 0) {
                formatted += input.substring(0, 2);
                if (input.length > 2) formatted += ' ' + input.substring(2, 6);
                if (input.length > 6) formatted += ' ' + input.substring(6, 10);
            }
            e.target.value = formatted;
        });
    }

    // Launch
    initCalendar();
});

