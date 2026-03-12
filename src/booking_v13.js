import {
    manageUser,
    createAppointment,
    getMonthlyAvailability,
    getOccupiedSlots,
    getMonthlyPromotion,
    getTenantMetadata
} from './firebase_v13.js';
import { tenantId } from './tenant-resolver.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log(`--- PORTALCOACH SaaS ENGINE v5.0 (${tenantId}) ---`);

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
        promoText: document.getElementById('promo-text'),
        friendPromoContainer: document.getElementById('friend-promo-container'),
        friendPhoneInput: document.getElementById('friend-phone'),
        checkoutModal: document.getElementById('checkout-modal'),
        payBtn: document.getElementById('pay-button'),
        checkoutBase: document.getElementById('checkout-base-price'),
        checkoutTotal: document.getElementById('checkout-total-price'),
        checkoutDiscountRow: document.getElementById('checkout-discount-row'),
        checkoutDiscountAmount: document.getElementById('checkout-discount-amount'),
        verifyModal: document.getElementById('verify-modal'),
        verifyConfirmBtn: document.getElementById('confirm-verify-btn'),
        verifyError: document.getElementById('verify-error'),
        otpInputs: document.querySelectorAll('.otp-input')
    };

    window.closeCheckout = () => {
        elements.checkoutModal.classList.add('hidden');
    };

    // Validation
    const missing = Object.entries(elements).filter(([k, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
        console.warn('SaaS Engine: Optional/Missing DOM elements:', missing);
    }

    // State
    const now = new Date();
    let currentViewDate = new Date(now);
    let selectedDate = null;
    let selectedTime = null;
    let monthlyAppointmentsCache = {};
    let is90MinPromo = false;
    let isFriendPromo = false;

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    /**
     * Initializes the calendar with stats
     */
    async function initCalendar() {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const cacheKey = `${year}-${month}`;

        if (!monthlyAppointmentsCache[cacheKey]) {
            monthlyAppointmentsCache[cacheKey] = [];
        }

        // Render non-blocking shell first (UX priority)
        renderCalendarShell();

        try {
            const appointments = await getMonthlyAvailability(year, month);
            monthlyAppointmentsCache[cacheKey] = appointments;
            renderCalendarShell(); // Re-render with dots/data
        } catch (e) {
            console.warn("Background availability engine error:", e);
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
            is90MinPromo = promo.toLowerCase().includes('90 min');

            // Detect Friend Promo
            isFriendPromo = promo.toLowerCase().includes('amiga') || promo.toLowerCase().includes('recomienda');
            if (isFriendPromo && elements.friendPromoContainer) {
                elements.friendPromoContainer.classList.remove('hidden');
            }
        }
    }

    async function renderCalendarShell() {
        if (!elements.calendarGrid) return;
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        elements.currentMonthDisplay.textContent = `${monthNames[month]} ${year}`;
        elements.calendarGrid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startOffset = firstDay === 0 ? 6 : firstDay - 1;

        for (let i = 0; i < startOffset; i++) {
            elements.calendarGrid.appendChild(document.createElement('div'));
        }

        const cacheKey = `${year}-${month}`;
        const monthAppointments = monthlyAppointmentsCache[cacheKey] || [];

        const metadata = await getTenantMetadata(tenantId);
        const schedule = metadata?.schedule || { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17 };

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0); // Strict normalization

            const dayOfWeek = date.getDay();
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isConfiguredOff = !schedule.days.includes(dayOfWeek);
            const isPast = date.getTime() < today.getTime();
            const isSelected = selectedDate === dateStr;

            const btn = document.createElement('button');
            btn.className = `h-12 w-full rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center relative border border-transparent `;

            if (isConfiguredOff || isPast) {
                btn.disabled = true;
                btn.className += "opacity-20 cursor-not-allowed text-slate-500 scale-90 grayscale";
                btn.textContent = day;
            } else {
                btn.className += isSelected ? "v-grid-day-active shadow-lg" : "text-white hover:bg-white/5 border-white/5";
                btn.innerHTML = `<span>${day}</span>`;

                const count = monthAppointments.filter(a => a.date === dateStr).length;
                const dot = document.createElement('span');

                let colorClass = 'bg-green-500';
                if (count >= 10) colorClass = 'bg-red-500 shadow-[0_0_8px_red]';
                else if (count > 0) colorClass = 'bg-yellow-500';

                dot.className = `w-1.5 h-1.5 rounded-full mt-1.5 ${colorClass} transition-colors`;
                if (!isSelected) btn.appendChild(dot);

                btn.onclick = (e) => {
                    e.preventDefault();
                    if (count >= 10) return;
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
        if (!elements.timeSlotsContainer) return;
        elements.timeSection.classList.remove('hidden');
        elements.timeSlotsContainer.innerHTML = '';
        elements.formSection.classList.add('hidden');

        try {
            const metadata = await getTenantMetadata(tenantId);
            const schedule = metadata?.schedule || { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17 };

            const occupied = await getOccupiedSlots(dateStr);
            const hours = [];
            for (let h = schedule.startHour; h <= schedule.endHour; h++) {
                hours.push(h);
            }

            hours.forEach((h) => {
                const time = `${h.toString().padStart(2, '0')}:00`;
                let isTaken = occupied.includes(time);

                // For 90-min sessions, we also need the NEXT hour to be free
                if (is90MinPromo && !isTaken) {
                    const nextH = h + 1;
                    const nextTime = `${nextH.toString().padStart(2, '0')}:00`;
                    const isNextTaken = occupied.includes(nextTime);
                    // If next hour is out of range (past endHour) or taken, this hour is effectively taken
                    if (h === schedule.endHour || isNextTaken) {
                        isTaken = true;
                    }
                }

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
                        elements.formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    };
                } else {
                    btn.disabled = true;
                }
                elements.timeSlotsContainer.appendChild(btn);
            });
        } catch (err) {
            elements.timeSlotsContainer.innerHTML = '<div class="col-span-3 text-center text-red-400 py-6 text-xs">Error.</div>';
        }
    }

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
            elements.errorMsg.textContent = "Completa tus datos.";
            elements.errorMsg.classList.remove('hidden');
            return;
        }

        elements.errorMsg.classList.add('hidden');
        elements.confirmBtn.disabled = true;
        elements.confirmBtn.innerHTML = 'CALCULANDO...';

        const checkData = {
            id: Math.random().toString(36).substring(2, 9).toUpperCase(),
            tenant_id: tenantId,
            name: name,
            phone: phone.replace(/\D/g, ''),
            email: email,
            date: selectedDate,
            time: selectedTime,
            previewOnly: true
        };

        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-Id': tenantId
                },
                body: JSON.stringify({ ...checkData, doubleSlot: is90MinPromo })
            });
            const result = await response.json();

            if (response.ok && (result.success || result.finalPrice !== undefined)) {
                const final = result.finalPrice;
                elements.checkoutBase.textContent = `$${final}.00`;
                elements.checkoutTotal.textContent = `$${final}.00`;
                elements.checkoutModal.classList.remove('hidden');
            } else {
                const errorText = result.message || result.error || "No se pudo calcular el precio. Intente más tarde.";
                elements.errorMsg.textContent = errorText;
                elements.errorMsg.classList.remove('hidden');
            }
        } catch (err) {
            console.error("Checkout Error:", err);
            elements.errorMsg.textContent = "Error de conexión. Verifique su internet.";
            elements.errorMsg.classList.remove('hidden');
        } finally {
            elements.confirmBtn.disabled = false;
            elements.confirmBtn.textContent = 'Confirmar Reserva';
        }
    };

    const resendBtn = document.getElementById('resend-code-btn');
    if (resendBtn) {
        resendBtn.onclick = (e) => {
            e.preventDefault();
            showVerification();
        };
    }

    let isSandbox = true;

    const showVerification = async () => {
        const phone = elements.phoneInput.value.replace(/\D/g, '');
        
        elements.verifyModal.classList.remove('hidden');
        elements.verifyError.classList.add('hidden');
        elements.otpInputs.forEach(input => {
            input.value = '';
            input.disabled = true;
        });

        try {
            console.log(`[SECURITY] Solicitando OTP para: ${phone}`);
            elements.verifyError.classList.add('hidden');
            
            const res = await fetch('/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, tenant_id: tenantId })
            });
            const data = await res.json();
            
            if (data.alreadyVerified) {
                console.log("[SECURITY] Usuario ya verificado. Saltando OTP.");
                elements.verifyModal.classList.add('hidden');
                await executeFinalBooking();
                return;
            }

            if (res.status === 429) {
                elements.verifyError.textContent = data.message || "Límite de mensajes alcanzado.";
                elements.verifyError.classList.remove('hidden');
                return;
            }

            isSandbox = data.sandbox;
            
            // Re-enable inputs
            elements.otpInputs.forEach(input => input.disabled = false);
            elements.otpInputs[0].focus();

            if (data.success && isSandbox) {
                console.log("%c[SECURITY] MODO SANDBOX: El código se envió a la consola del servidor.", "color: #fbbf24; font-weight: bold;");
            }
        } catch (err) {
            console.error("Error al enviar OTP:", err);
            elements.verifyError.textContent = "Error al enviar el código. Reintente.";
            elements.verifyError.classList.remove('hidden');
        }
    };

    elements.otpInputs.forEach((input, idx) => {
        input.addEventListener('keyup', (e) => {
            if (e.key >= 0 && e.key <= 9) {
                input.value = e.key;
                if (idx < elements.otpInputs.length - 1) elements.otpInputs[idx + 1].focus();
            } else if (e.key === 'Backspace') {
                if (idx > 0) elements.otpInputs[idx - 1].focus();
            }
        });
    });

    elements.verifyConfirmBtn.addEventListener('click', async () => {
        const enteredOtp = Array.from(elements.otpInputs).map(i => i.value).join('');
        
        if (enteredOtp.length < 4) return;

        elements.verifyConfirmBtn.disabled = true;
        elements.verifyConfirmBtn.textContent = "VERIFICANDO...";

        try {
            // In a real scenario, we verify this against Firestore in take2 or in /api/save.
            // For now, to keep it smooth, we pass it to executeFinalBooking
            await executeFinalBooking(enteredOtp);
        } catch (err) {
            elements.verifyError.textContent = "Error de validación.";
            elements.verifyError.classList.remove('hidden');
            elements.verifyConfirmBtn.disabled = false;
            elements.verifyConfirmBtn.textContent = "Verificar y Reservar";
        }
    });

    // FINAL STEP: Execute payment trigger
    if (elements.payBtn) {
        elements.payBtn.onclick = () => {
            showVerification();
        };
    }

    async function executeFinalBooking(otpCode) {
        if (!elements.payBtn) return;
        elements.payBtn.disabled = true;
        elements.payBtn.innerHTML = 'PROCESANDO...';

            const appointmentId = Math.random().toString(36).substring(2, 9).toUpperCase();
            const finalData = {
                id: appointmentId,
                tenant_id: tenantId,
                name: elements.nameInput.value,
                email: elements.emailInput.value,
                phone: elements.phoneInput.value.replace(/\D/g, ''),
                date: selectedDate,
                time: selectedTime,
                otp: otpCode // Pass OTP for backend verification
            };

            try {
                const response = await fetch('/api/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Tenant-Id': tenantId
                    },
                    body: JSON.stringify({ ...finalData, doubleSlot: is90MinPromo })
                });

                if (response.ok) {
                    const result = await response.json();

                    // PHASE 2: STRIPE REDIRECT (SANDBOX)
                    if (result.checkoutUrl) {
                        console.log("Redirecting to Stripe Sandbox:", result.checkoutUrl);
                        window.location.href = result.checkoutUrl;
                        return;
                    }

                    window.location.href = `/success.html?id=${appointmentId}&name=${encodeURIComponent(finalData.name)}&date=${finalData.date}&time=${finalData.time}`;
                } else {
                    const result = await response.json();
                    const errorMsg = result.message || result.error || "Error al procesar la reserva.";
                    
                    elements.verifyError.textContent = errorMsg;
                    elements.verifyError.classList.remove('hidden');
                    
                    console.error("Booking failed:", result);
                    
                    // Reset button
                    elements.payBtn.disabled = false;
                    elements.payBtn.textContent = 'Pagar y Agendar';
                }
            } catch (err) {
                console.error("Execute Booking Error:", err);
                elements.verifyError.textContent = "Error de comunicación con el servidor.";
                elements.verifyError.classList.remove('hidden');
                
                elements.payBtn.disabled = false;
                elements.payBtn.textContent = 'Pagar y Agendar';
            }
    }

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

    initPromotion();
    initCalendar();
});

