import {
    getMonthlyAvailability,
    getOccupiedSlots,
    getMonthlyPromotion
} from './firebase_v13.js';

document.addEventListener('DOMContentLoaded', () => {
    window.isDemoMode = false; // Live medical demo
    console.log('--- MEDPRO AI CLINICAL ENGINE v1.0 ---');

    const elements = {
        calendarGrid: document.getElementById('calendar-container'),
        timeSlotsContainer: document.getElementById('time-slots-container'),
        currentMonthDisplay: document.getElementById('current-month-year'),
        confirmBtn: document.getElementById('confirm-booking'),
        errorMsg: document.getElementById('error-message'),
        nameInput: document.getElementById('name'),
        emailInput: document.getElementById('email'),
        phoneInput: document.getElementById('phone'),
        insuranceSelect: document.getElementById('insurance'),
        timeSection: document.getElementById('time-slots-container'),
        step2Section: document.getElementById('step-2'),
        prevMonthBtn: document.getElementById('prev-month'),
        nextMonthBtn: document.getElementById('next-month'),
        checkoutModal: document.getElementById('checkout-modal'),
        payBtn: document.getElementById('pay-button'),
        checkoutBase: document.getElementById('checkout-base-price'),
        checkoutTotal: document.getElementById('checkout-total-price'),
        checkoutDiscountRow: document.getElementById('checkout-discount-row'),
        checkoutDiscountAmount: document.getElementById('checkout-discount-amount'),
        insuranceTag: document.getElementById('insurance-tag')
    };

    window.closeCheckout = () => {
        elements.checkoutModal.classList.add('hidden');
    };

    let now = new Date();
    let currentViewDate = new Date(now);
    let selectedDate = null;
    let selectedTime = null;
    let monthlyAppointmentsCache = {};

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    async function initCalendar() {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const cacheKey = `${year}-${month}`;

        elements.currentMonthDisplay.textContent = `${monthNames[month]} ${year}`;
        elements.calendarGrid.innerHTML = '';

        if (!monthlyAppointmentsCache[cacheKey]) {
            monthlyAppointmentsCache[cacheKey] = [];
            try {
                const appointments = await getMonthlyAvailability(year, month);
                monthlyAppointmentsCache[cacheKey] = appointments;
            } catch (e) { }
        }

        renderCalendar();
    }

    function renderCalendar() {
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let startOffset = firstDay === 0 ? 6 : firstDay - 1;

        elements.calendarGrid.innerHTML = '';
        for (let i = 0; i < startOffset; i++) elements.calendarGrid.appendChild(document.createElement('div'));

        const appointments = monthlyAppointmentsCache[`${year}-${month}`] || [];

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const isPast = new Date(year, month, day) < today;
            const isSelected = selectedDate === dateStr;

            const btn = document.createElement('button');
            btn.className = `h-12 w-full rounded-2xl text-xs font-bold transition-all flex flex-col items-center justify-center relative border border-transparent `;

            if (isPast) {
                btn.className += "opacity-20 cursor-not-allowed text-slate-500 scale-90";
                btn.textContent = day;
            } else {
                btn.className += isSelected ? "bg-primary text-[#042f2e] shadow-lg" : "text-white hover:bg-white/5 border-white/5";
                btn.innerHTML = `<span>${day}</span>`;

                const count = appointments.filter(a => a.date === dateStr).length;
                if (count > 0 && !isSelected) {
                    const dot = document.createElement('span');
                    dot.className = `w-1.5 h-1.5 rounded-full mt-1.5 ${count >= 9 ? 'bg-red-500' : 'bg-primary'} transition-colors`;
                    btn.appendChild(dot);
                }

                btn.onclick = () => {
                    selectedDate = dateStr;
                    renderCalendar();
                    loadTimeSlots(dateStr);
                };
            }
            elements.calendarGrid.appendChild(btn);
        }
    }

    async function loadTimeSlots(dateStr) {
        elements.timeSection.classList.remove('hidden');
        elements.timeSlotsContainer.innerHTML = '';
        elements.step2Section.classList.add('hidden');

        try {
            const occupied = await getOccupiedSlots(dateStr);
            const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];

            hours.forEach(h => {
                const time = `${h.toString().padStart(2, '0')}:00`;
                const isTaken = occupied.includes(time);

                const btn = document.createElement('button');
                btn.className = `p-4 rounded-xl text-xs font-bold transition-all border ${isTaken ? 'opacity-20 cursor-not-allowed border-transparent' : 'glass-panel hover:bg-primary/20 hover:border-primary/50 text-white border-white/10'}`;
                btn.innerHTML = `<span>${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}</span>`;

                if (!isTaken) {
                    btn.onclick = () => {
                        selectedTime = time;
                        document.querySelectorAll('#time-slots-container button').forEach(b => b.classList.remove('border-primary', 'bg-primary/20'));
                        btn.classList.add('border-primary', 'bg-primary/20');
                        elements.step2Section.classList.remove('hidden');
                        elements.step2Section.scrollIntoView({ behavior: 'smooth' });
                    };
                } else {
                    btn.disabled = true;
                }
                elements.timeSlotsContainer.appendChild(btn);
            });
        } catch (err) { }
    }

    elements.prevMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); initCalendar(); };
    elements.nextMonthBtn.onclick = () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); initCalendar(); };

    elements.confirmBtn.onclick = async () => {
        const name = elements.nameInput.value.trim();
        const insurance = elements.insuranceSelect.value;
        if (!name || !elements.phoneInput.value || !selectedDate || !selectedTime || !insurance) {
            elements.errorMsg.textContent = "Please complete all fields (Patient Name, Phone, and Insurance).";
            elements.errorMsg.classList.remove('hidden');
            return;
        }

        elements.errorMsg.classList.add('hidden');
        elements.confirmBtn.disabled = true;
        elements.confirmBtn.textContent = 'Calculating Coverage...';

        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: Math.random().toString(36).substring(2, 9).toUpperCase(),
                    name: name,
                    phone: elements.phoneInput.value.replace(/\D/g, ''),
                    email: elements.emailInput.value,
                    date: selectedDate,
                    time: selectedTime,
                    serviceType: 'MEDICAL',
                    insurance: insurance,
                    previewOnly: true
                })
            });

            const result = await response.json();
            if (result.finalPrice !== undefined) {
                elements.checkoutBase.textContent = `$1,200.00`;
                elements.checkoutTotal.textContent = `$${result.finalPrice.toFixed(2)}`;
                elements.insuranceTag.textContent = insurance === 'private' ? 'Self-Pay Discount' : `${insurance.toUpperCase()} Coverage`;

                if (result.finalPrice < 1200) {
                    elements.checkoutDiscountRow.classList.remove('hidden');
                    elements.checkoutDiscountAmount.textContent = `-$${(1200 - result.finalPrice).toFixed(2)}`;
                } else {
                    elements.checkoutDiscountRow.classList.add('hidden');
                }
                elements.checkoutModal.classList.remove('hidden');
            }
        } catch (e) {
            elements.errorMsg.textContent = "Connection failed. Please check your internet.";
            elements.errorMsg.classList.remove('hidden');
        } finally {
            elements.confirmBtn.disabled = false;
            elements.confirmBtn.textContent = 'Review Consultation';
        }
    };

    elements.payBtn.onclick = async () => {
        elements.payBtn.disabled = true;
        elements.payBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Processing...';

        const finalData = {
            id: Math.random().toString(36).substring(2, 9).toUpperCase(),
            name: elements.nameInput.value,
            email: elements.emailInput.value,
            phone: elements.phoneInput.value.replace(/\D/g, ''),
            insurance: elements.insuranceSelect.value,
            date: selectedDate,
            time: selectedTime,
            serviceType: 'MEDICAL'
        };

        try {
            const res = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });

            if (res.ok) {
                window.location.href = `/demo-success.html?id=${finalData.id}&name=${encodeURIComponent(finalData.name)}&date=${finalData.date}&time=${finalData.time}&msg=Clinical Confirmation Successful`;
            }
        } catch (e) {
            alert("Unexpected error. Please contact the clinic.");
            elements.payBtn.disabled = false;
        }
    };

    initCalendar();
});
