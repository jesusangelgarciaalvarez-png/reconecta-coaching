import {
    manageUser,
    createAppointment,
    getMonthlyAvailability,
    getOccupiedSlots
} from './firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    let defaultFocusDate = new Date(now);

    // Logic: Default focus on next available weekday
    const dayIdx = defaultFocusDate.getDay();
    if (dayIdx === 0) defaultFocusDate.setDate(defaultFocusDate.getDate() + 1);
    else if (dayIdx === 6) defaultFocusDate.setDate(defaultFocusDate.getDate() + 2);

    let selectedDate = new Date(defaultFocusDate);
    let currentViewDate = new Date(defaultFocusDate);
    let monthlyStats = {};

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    // OPTIMIZATION: Non-blocking data update
    async function updateCalendarData() {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();

        // 1. Render calendar immediately without dots
        renderCalendar(true);

        try {
            // 2. Fetch stats in background
            monthlyStats = await getMonthlyAvailability(year, month);
            // 3. Update dots when data arrives
            renderCalendar(false);
        } catch (error) {
            console.error("Error fetching stats:", error);
            renderCalendar(false); // Render anyway without dots
        }
    }

    function renderCalendar(isLoadingStats = false) {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const todayRef = new Date();
        todayRef.setHours(0, 0, 0, 0);

        document.getElementById('current-month-year').textContent = `${monthNames[month]} ${year}`;

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        const grid = document.getElementById('calendar-grid');
        grid.innerHTML = '';

        for (let i = 0; i < startOffset; i++) {
            grid.appendChild(document.createElement('div'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
            const isPassed = date < todayRef;

            const btn = document.createElement('button');
            btn.type = "button";
            btn.className = `h-10 sm:h-12 w-full rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-black transition-all flex flex-col items-center justify-center relative z-20 `;

            if (isWeekend) {
                btn.className += "text-white/5 cursor-not-allowed pointer-events-none";
                btn.innerHTML = `<span>${day}</span>`;
            } else if (isPassed) {
                btn.className += "text-white/10 cursor-not-allowed pointer-events-none";
                btn.innerHTML = `<span>${day}</span>`;
            } else {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    selectedDate = new Date(year, month, day);
                    renderCalendar();
                    renderTimeSlots(dateStr);
                });

                let statusHTML = '';
                if (isLoadingStats) {
                    statusHTML = '<span class="w-1.5 h-1.5 rounded-full bg-white/10 mt-1 animate-pulse"></span>';
                } else {
                    const count = monthlyStats[dateStr] || 0;
                    const isFull = count >= 9;

                    if (isFull) {
                        statusHTML = '<span class="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>';
                    } else if (count > 0) {
                        statusHTML = '<span class="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1 shadow-[0_0_8px_rgba(234,179,8,0.8)]"></span>';
                    } else {
                        statusHTML = '<span class="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>';
                    }

                    if (isFull) {
                        btn.className += "text-red-400 opacity-60";
                        btn.title = "Día Completo";
                    }
                }

                if (isSelected) {
                    btn.className += "bg-primary text-[#0a1f1f] shadow-[0_0_20px_rgba(212,160,10,0.6)] scale-110";
                } else {
                    btn.className += "text-white hover:bg-white/10";
                }

                btn.innerHTML = `<span>${day}</span>${isSelected ? '' : statusHTML}`;
            }
            grid.appendChild(btn);
        }
    }

    async function renderTimeSlots(dateStr) {
        if (!selectedDate) return;
        const container = document.getElementById('time-slots-container');
        container.innerHTML = ' <div class="col-span-2 text-center text-slate-400 text-xs animate-pulse py-10">Cargando horarios...</div>';

        try {
            const occupiedSlots = await getOccupiedSlots(dateStr);
            container.innerHTML = '';

            for (let hour = 9; hour < 18; hour++) {
                const timeString = `${hour.toString().padStart(2, '0')}:00`;
                const isTaken = occupiedSlots.includes(timeString);

                const btn = document.createElement('button');
                btn.type = "button";
                btn.className = `time-slot glass-panel py-3 md:py-4 rounded-xl md:rounded-2xl text-xs md:text-sm font-semibold transition-all flex flex-col items-center justify-center relative `;

                if (isTaken) {
                    btn.className += "opacity-50 cursor-not-allowed text-red-500 bg-red-500/10 border-red-500/30";
                    btn.innerHTML = `<span>${timeString}</span><span class="text-[8px] font-bold mt-1">OCUPADO</span>`;
                    btn.disabled = true;
                } else {
                    btn.className += "hover:bg-white/20 text-white bg-white/5";
                    btn.innerHTML = `<span>${timeString}</span><span class="w-1 h-1 rounded-full bg-green-500 mt-1"></span>`;
                    btn.onclick = () => {
                        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('time-slot-active'));
                        btn.classList.add('time-slot-active');
                    };
                }
                container.appendChild(btn);
            }
        } catch (error) {
            console.error("Error loading slots:", error);
            container.innerHTML = '<div class="col-span-2 text-red-400 text-xs text-center">Error al cargar horarios. Reintenta.</div>';
        }
    }

    document.getElementById('prev-month').onclick = () => {
        currentViewDate.setMonth(currentViewDate.getMonth() - 1);
        updateCalendarData();
    };

    document.getElementById('next-month').onclick = () => {
        currentViewDate.setMonth(currentViewDate.getMonth() + 1);
        updateCalendarData();
    };

    document.getElementById('confirm-booking').onclick = async () => {
        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const phone = document.getElementById('user-phone').value.trim();
        const errorMsg = document.getElementById('error-message');
        const selectedSlot = document.querySelector('.time-slot-active');

        if (!name || !email || !phone || !selectedDate || !selectedSlot) {
            errorMsg.textContent = !selectedDate ? "Selecciona un día." : (!selectedSlot ? "Selecciona un horario." : "Completa tus datos.");
            errorMsg.classList.remove('hidden');
            return;
        }

        errorMsg.classList.add('hidden');
        document.getElementById('confirm-booking').disabled = true;
        document.getElementById('confirm-booking').textContent = "Procesando...";

        try {
            console.log("Starting booking process for:", email);

            // 1. Manage User
            const userResult = await manageUser(email, { name, phone });
            console.log("User managed successfully");

            // 2. Register Appointment
            const dateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
            const timeStr = selectedSlot.querySelector('span').textContent;

            const appointmentId = Math.floor(100000 + Math.random() * 900000).toString();
            const meetLink = `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;

            const bookingData = {
                id: appointmentId,
                name,
                email,
                phone,
                date: dateStr,
                time: timeStr,
                timestamp: selectedDate.getTime(),
                meetLink,
                isFree: userResult.isFirstTime
            };

            await createAppointment(bookingData);
            console.log("Appointment created!");

            sessionStorage.setItem('lastBooking', JSON.stringify(bookingData));
            window.location.href = '/success.html';
        } catch (error) {
            console.error("CRITICAL BOOKING ERROR:", error);
            errorMsg.textContent = "Error de conexión con el servidor. Por favor, asegúrate de tener conexión e intenta de nuevo.";
            errorMsg.classList.remove('hidden');
            document.getElementById('confirm-booking').disabled = false;
            document.getElementById('confirm-booking').textContent = "Confirmar Cita";
        }
    };

    // INITIAL LOAD: Parallel execution for speed
    updateCalendarData();
    const initialDateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
    renderTimeSlots(initialDateStr);
});
