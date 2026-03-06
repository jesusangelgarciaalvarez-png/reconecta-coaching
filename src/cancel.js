import { getUserAppointments, getAppointment, deleteAppointment, decrementUserVisit } from './firebase_v13.js';

document.addEventListener('DOMContentLoaded', () => {
    const idForm = document.getElementById('id-form');
    const phoneForm = document.getElementById('phone-form');
    const selectionContainer = document.getElementById('selection-container');
    const appointmentList = document.getElementById('appointment-list');

    let currentAppointments = [];

    // --- UTILS ---
    const formatDate = (dateStr) => {
        const [y, m, d] = dateStr.split('-');
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    const isWithin24h = (dateStr, timeStr) => {
        const appDate = new Date(dateStr + 'T' + timeStr);
        const now = new Date();
        const diffMs = appDate - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours < 24;
    };

    // Phone Formatter (10 digits: XX XXXX XXXX)
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
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

    const showMsg = (text, type = 'info') => {
        quickMsg.textContent = text;
        quickMsg.className = `mt-6 p-4 rounded-2xl text-xs font-semibold block `;
        if (type === 'error') quickMsg.className += "bg-red-500/10 text-red-400";
        else if (type === 'warning') quickMsg.className += "bg-orange-500/10 text-orange-400";
        else if (type === 'success') quickMsg.className += "bg-green-500/10 text-green-400";
        else quickMsg.className += "bg-white/5 text-slate-400";
        quickMsg.classList.remove('hidden');
    };

    // --- LOGIC: BY ID ---
    if (idForm) {
        idForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = idInput.value.trim();
            if (!id || id.length < 6) {
                showMsg("Por favor ingresa un ID válido de 6 dígitos.", "error");
                return;
            }

            const btn = idForm.querySelector('button');
            btn.disabled = true;
            btn.textContent = "...";
            quickMsg.classList.add('hidden');
            selectionContainer.classList.add('hidden');

            try {
                const app = await getAppointment(id);
                if (!app) {
                    showMsg("No encontramos ninguna cita con ese ID. Verifica tu código.", "error");
                } else if (isWithin24h(app.date, app.time)) {
                    showMsg("Esta cita es en menos de 24 horas. Según la política, las cancelaciones deben ser con mayor antelación.", "warning");
                } else {
                    if (confirm(`¿Confirmas la cancelación de tu cita del ${formatDate(app.date)}?`)) {
                        await deleteAppointment(app.docId, app.date, app.time);
                        if (app.phone) await decrementUserVisit(app.phone);
                        showMsg("¡Cita cancelada con éxito!", "success");
                        idInput.value = '';
                    }
                }
            } catch (error) {
                showMsg("Error de conexión. Intenta de nuevo.", "error");
            } finally {
                btn.disabled = false;
                btn.textContent = "Validar";
            }
        };
    }

    // --- LOGIC: BY PHONE ---
    if (phoneForm) {
        phoneForm.onsubmit = async (e) => {
            e.preventDefault();
            const phone = phoneInput.value.replace(/\D/g, '');
            if (phone.length < 10) {
                showMsg("Por favor ingresa un teléfono de 10 dígitos.", "error");
                return;
            }

            const btn = phoneForm.querySelector('button');
            btn.disabled = true;
            btn.textContent = "...";
            quickMsg.classList.add('hidden');
            selectionContainer.classList.add('hidden');

            try {
                const allApps = await getUserAppointments(phone);
                currentAppointments = allApps.filter(app => !isWithin24h(app.date, app.time));

                if (currentAppointments.length === 0) {
                    showMsg(allApps.length > 0
                        ? "Tus citas próximas están dentro del límite de 24 horas y no pueden cancelarse por aquí."
                        : "No encontramos citas pendientes con este número.", "warning");
                } else {
                    appointmentList.innerHTML = '';

                    // Option: Select All
                    if (currentAppointments.length > 1) {
                        const allItem = document.createElement('div');
                        allItem.className = 'appointment-item mb-4 bg-primary/10 border-primary/20';
                        allItem.innerHTML = `
                            <input type="checkbox" id="select-all-checkbox">
                            <label for="select-all-checkbox" class="flex-1 text-xs text-white font-bold cursor-pointer">SELECCIONAR TODAS LAS CITAS</label>
                        `;
                        appointmentList.appendChild(allItem);

                        const masterCb = allItem.querySelector('input');
                        masterCb.onchange = () => {
                            const cbs = appointmentList.querySelectorAll('.app-checkbox');
                            cbs.forEach(cb => {
                                cb.checked = masterCb.checked;
                                cb.closest('.appointment-item').classList.toggle('selected', masterCb.checked);
                            });
                        };
                    }

                    currentAppointments.forEach(app => {
                        const item = document.createElement('div');
                        item.className = 'appointment-item';
                        item.innerHTML = `
                            <input type="checkbox" class="app-checkbox" value="${app.docId}" id="cb-${app.docId}">
                            <div class="flex-1 cursor-pointer">
                                <p class="text-white text-xs font-bold">${formatDate(app.date)}</p>
                                <p class="text-slate-400 text-[10px] mt-1">${app.time} hrs • ID: ${app.appointmentId || 'N/A'}</p>
                            </div>
                        `;

                        // Click anywhere in the item to toggle
                        item.onclick = (e) => {
                            if (e.target.tagName !== 'INPUT') {
                                const cb = item.querySelector('input');
                                cb.checked = !cb.checked;
                                item.classList.toggle('selected', cb.checked);
                            } else {
                                item.classList.toggle('selected', e.target.checked);
                            }
                        };

                        appointmentList.appendChild(item);
                    });

                    selectionContainer.classList.remove('hidden');
                }
            } catch (error) {
                showMsg("Error al buscar citas. Verifica tu conexión.", "error");
            } finally {
                btn.disabled = false;
                btn.textContent = "Buscar";
            }
        };
    }

    // --- LOGIC: MULTI-CANCEL ---
    if (cancelBtn) {
        cancelBtn.onclick = async () => {
            const checkedBoxes = Array.from(appointmentList.querySelectorAll('.app-checkbox:checked'));
            if (checkedBoxes.length === 0) {
                alert("Por favor selecciona al menos una cita para cancelar.");
                return;
            }

            if (!confirm(`¿Confirmas la cancelación de las ${checkedBoxes.length} citas seleccionadas?`)) return;

            cancelBtn.disabled = true;
            cancelBtn.textContent = "Procesando...";

            try {
                for (const cb of checkedBoxes) {
                    const docId = cb.value;
                    const app = currentAppointments.find(a => a.docId === docId);
                    if (app) {
                        await deleteAppointment(app.docId, app.date, app.time);
                        if (app.phone) await decrementUserVisit(app.phone);
                    }
                }

                showMsg(checkedBoxes.length > 1 ? "¡Todas las citas seleccionadas han sido canceladas!" : "¡Cita cancelada con éxito!", "success");
                selectionContainer.classList.add('hidden');
                phoneInput.value = '';
            } catch (error) {
                showMsg("No se pudo completar la transacción.", "error");
            } finally {
                cancelBtn.disabled = false;
                cancelBtn.textContent = "Confirmar Cancelación";
            }
        };
    }
});
