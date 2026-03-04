import {
    manageUser,
    createAppointment,
    getMonthlyAvailability,
    getOccupiedSlots
} from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('RECONECTA CALENDAR V3 - PHONE KEY ENABLED');

    // UI Elements
    const calendarGrid = document.getElementById('calendar-grid');
    const timeSlotsContainer = document.getElementById('time-slots-container');
    const currentMonthDisplay = document.getElementById('current-month-year');
    const confirmBtn = document.getElementById('confirm-booking');
    const errorMsg = document.getElementById('error-message');

    // Inputs
    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    const phoneInput = document.getElementById('user-phone');

    // State
    const now = new Date();
    let currentViewDate = new Date(now);
    let selectedDate = null;
    let selectedTime = null;
    let monthlyStatsCache = {};

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    /**
     * Renders the calendar for the current view date
     */
    async function initCalendar() {
        renderCalendarShell();

        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const cacheKey = `${year}-${month}`;

        try {
            // Background fetch for dot indicators
            const stats = await getMonthlyAvailability(year, month);
            monthlyStatsCache[cacheKey] = stats;
            renderCalendarShell(); // Refresh with dots
        } catch (e) {
            console.warn("Could not load indicators", e);
        }
    }

    function renderCalendarShell() {
        if (!calendarGrid) return;
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        currentMonthDisplay.textContent = `${monthNames[month]} ${year}`;
        calendarGrid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startOffset = firstDay === 0 ? 6 : firstDay - 1;

        // Blanks
        for (let i = 0; i < startOffset; i++) {
            calendarGrid.appendChild(document.createElement('div'));
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
            btn.className = `h-10 sm:h-12 w-full rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center relative `;

            if (isWeekend || isPast) {
                btn.className += "opacity-20 cursor-not-allowed text-slate-500";
                btn.textContent = day;
            } else {
                btn.className += isSelected ? "bg-primary text-[#0a1f1f] shadow-lg scale-105" : "text-white hover:bg-white/10";
                btn.innerHTML = `<span>${day}</span>`;

                // Dot Indicators
                const count = stats[dateStr] || 0;
                const dot = document.createElement('span');
                dot.className = `w-1 h-1 rounded-full mt-1 ${count >= 9 ? 'bg-red-500 shadow-[0_0_5px_red]' : (count > 0 ? 'bg-yellow-500' : 'bg-green-500')}`;
                if (!isSelected) btn.appendChild(dot);

                btn.onclick = (e) => {
                    e.preventDefault();
                    if (count >= 9) return;
                    selectedDate = dateStr;
                    selectedTime = null; // Reset time
                    renderCalendarShell();
                    loadTimeSlots(dateStr);
                };
            }
            calendarGrid.appendChild(btn);
        }
    }

    async function loadTimeSlots(dateStr) {
        timeSlotsContainer.innerHTML = '<div class="col-span-2 text-center text-slate-500 py-6 text-xs italic">Cargando horarios...</div>';

        try {
            const occupied = await getOccupiedSlots(dateStr);
            timeSlotsContainer.innerHTML = '';

            const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
            hours.forEach(h => {
                const time = `${h.toString().padStart(2, '0')}:00`;
                const isTaken = occupied.includes(time);

                const btn = document.createElement('button');
                btn.className = `time-slot p-4 rounded-2xl text-sm font-semibold transition-all border ${isTaken ? 'opacity-30 cursor-not-allowed bg-white/5 border-transparent' : 'glass-panel hover:bg-white/20 text-white border-white/10'}`;

                if (selectedTime === time) btn.classList.add('time-slot-active');

                btn.innerHTML = `<span>${time} ${h < 12 ? 'AM' : 'PM'}</span>`;
                if (!isTaken) {
                    btn.onclick = () => {
                        selectedTime = time;
                        document.querySelectorAll('.time-slot').forEach(b => b.classList.remove('time-slot-active'));
                        btn.classList.add('time-slot-active');
                    };
                } else {
                    btn.disabled = true;
                }
                timeSlotsContainer.appendChild(btn);
            });
        } catch (err) {
            timeSlotsContainer.innerHTML = '<div class="col-span-2 text-center text-red-400 py-6 text-xs">Error al cargar horarios.</div>';
        }
    }

    // Event Listeners
    document.getElementById('prev-month').onclick = (e) => {
        e.preventDefault();
        currentViewDate.setMonth(currentViewDate.getMonth() - 1);
        initCalendar();
    };

    document.getElementById('next-month').onclick = (e) => {
        e.preventDefault();
        currentViewDate.setMonth(currentViewDate.getMonth() + 1);
        initCalendar();
    };

    confirmBtn.onclick = async () => {
        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const phone = phoneInput.value.trim();

        if (!name || !email || !phone || !selectedDate || !selectedTime) {
            errorMsg.textContent = "Por favor selecciona fecha, hora y completa tus datos.";
            errorMsg.classList.remove('hidden');
            return;
        }

        errorMsg.classList.add('hidden');
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Procesando...";

        try {
            // Primary Key: Phone
            const userResult = await manageUser(phone, { name, email });
            const appointmentId = Math.floor(100000 + Math.random() * 900000).toString();
            const meetLink = `https://meet.google.com/hbm-pivc-mvy`; // Placeholder for now

            const bookingData = {
                id: appointmentId,
                name,
                email,
                phone: phone.replace(/\D/g, ''),
                date: selectedDate,
                time: selectedTime,
                timestamp: new Date(`${selectedDate}T${selectedTime}`).getTime(),
                meetLink,
                isFree: userResult.isFirstTime
            };

            await createAppointment(bookingData);
            sessionStorage.setItem('lastBooking', JSON.stringify(bookingData));
            window.location.href = '/success.html';
        } catch (err) {
            console.error(err);
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirmar Cita";
            errorMsg.textContent = "Error al confirmar. Intenta de nuevo.";
            errorMsg.classList.remove('hidden');
        }
    };

    // Auto-focus phone or name?
    // Start calendar
    initCalendar();
});
