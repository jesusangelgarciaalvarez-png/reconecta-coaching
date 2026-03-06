import {
    manageUser,
    createAppointment,
    getMonthlyAvailability,
    getOccupiedSlots,
    getMonthlyPromotion
} from './firebase_v13.js';

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
        nextMonthBtn: document.getElementById('next-month'),
        promoBanner: document.getElementById('promo-banner'),
        promoText: document.getElementById('promo-text')
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
    let monthlyAppointmentsCache = {}; // Array of {date, time}

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    /**
     * Initializes the calendar with stats
     */
    async function initCalendar(retryCount = 0) {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const cacheKey = `${year}-${month}`;

        // OPTIMISTIC INIT: Initialize cache with an empty array if it doesn't exist
        // This ensures loadTimeSlots is ALWAYS instant even if Firebase is struggling
        if (!monthlyAppointmentsCache[cacheKey]) {
            monthlyAppointmentsCache[cacheKey] = [];
        }

        renderCalendarShell();

        try {
            console.log(`Background fetch for ${cacheKey}...`);

            const statsPromise = getMonthlyAvailability(year, month);
            const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 12000));

            const appointments = await Promise.race([statsPromise, timeout]);
            monthlyAppointmentsCache[cacheKey] = appointments;
            console.log(`Availability loaded for ${cacheKey}:`, appointments.length);

            renderCalendarShell(); // Update shell with real dots
        } catch (e) {
            console.warn("Background availability engine error:", e);
            // We already have [] in cache, so we just let the user book anyway
        }
    }

    async function initPromotion() {
        if (!elements.promoBanner) return;

        const year = new Date().getFullYear();
        const monthNum = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const monthId = `${year}-${monthNum}`;

        const promo = await getMonthlyPromotion(monthId);
        if (promo) {
            elements.promoText.textContent = promo;
            elements.promoBanner.classList.remove('hidden');
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
        const monthAppointments = monthlyAppointmentsCache[cacheKey] || [];

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
                const count = monthAppointments.filter(a => a.date === dateStr).length;
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
        elements.timeSlotsContainer.innerHTML = '';

        // Hide form while slot selection is pending
        elements.formSection.classList.add('hidden');

        try {
            // OPTIMIZATION: Filter locally from month cache for "Instant" feel
            const year = currentViewDate.getFullYear();
            const month = currentViewDate.getMonth();
            const cacheKey = `${year}-${month}`;

            let occupied = [];
            if (monthlyAppointmentsCache[cacheKey]) {
                occupied = monthlyAppointmentsCache[cacheKey]
                    .filter(a => a.date === dateStr)
                    .map(a => a.time);
            } else {
                // Fallback if cache is missing (should not happen normally)
                occupied = await getOccupiedSlots(dateStr);
            }

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
        elements.confirmBtn.innerHTML = '<span class="flex items-center justify-center"><svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> PROCESANDO...</span>';

        try {
            console.log("Starting quick booking v7.0...");

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
                isFree: true, // Default in rescue mode
                build: 'v9.0-REST-ARCH'
            };

            // 1. Helper for ordinals
            const getOrdinal = (n) => {
                const ordinals = ["", "primera", "segunda", "tercera", "cuarta", "quinta", "sexta", "séptima", "octava", "novena", "décima"];
                if (n === 1) return "sesion gratuita, diagnóstico";
                if (n <= 10) return `Esta es tu ${ordinals[n]} visita`;
                return `Esta es tu visita número ${n}`;
            };

            // This call now returns the new visitCount
            const result = await createAppointment(bookingData);
            const visitCount = result.visitCount || 1;
            const visitMessage = getOrdinal(visitCount);

            console.log("SUCCESS AT LAST! Visit Count:", visitCount);

            // SAVE TO SESSION STORAGE FOR THE SUCCESS PAGE
            sessionStorage.setItem('lastBooking', JSON.stringify(bookingData));
            localStorage.setItem('reconecta_visitor_name', name);

            console.log("Moving to success page...");
            window.location.href = `/success.html?id=${appointmentId}&date=${selectedDate}&time=${selectedTime}&name=${encodeURIComponent(name)}&msg=${encodeURIComponent(visitMessage)}`;

        } catch (err) {
            console.error("DEBUG BOOKING FAILURE:", err);

            let technicalInfo = "NO_DATA";
            if (err.message && err.message.includes("Error Servidor (500): ")) {
                try {
                    const parts = err.message.split("Error Servidor (500): ");
                    technicalInfo = parts[1];
                } catch (e) { }
            } else {
                technicalInfo = JSON.stringify({ message: err.message, stack: err.stack });
            }

            // CAMBIO RADICAL: Mensaje enorme para que no se corte
            elements.errorMsg.style.display = "block";
            elements.errorMsg.style.whiteSpace = "pre-wrap";
            elements.errorMsg.style.textAlign = "left";
            elements.errorMsg.style.fontSize = "12px";
            elements.errorMsg.style.background = "#000";
            elements.errorMsg.style.border = "2px solid red";
            elements.errorMsg.style.padding = "20px";
            elements.errorMsg.style.color = "#ff3333";
            elements.errorMsg.style.width = "100%";
            elements.errorMsg.style.maxHeight = "400px";
            elements.errorMsg.style.overflowY = "auto";

            elements.errorMsg.innerHTML = `
                <div style="font-weight:bold; margin-bottom:10px;">⚠️ ERROR DE GOOGLE (LÉEME COMPLETO):</div>
                <div style="font-family:monospace; line-height:1.4;">
                ${technicalInfo}
                </div>
                <div style="margin-top:15px; color:white; font-size:10px;">
                Toma captura de este CUADRO NEGRO completo.
                </div>
            `;

            elements.errorMsg.classList.remove('hidden');
            elements.confirmBtn.disabled = false;
            elements.confirmBtn.innerHTML = 'REPROBAR (MOTOR v13)';
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
    // Start everything
    initPromotion();
    initCalendar();
});

