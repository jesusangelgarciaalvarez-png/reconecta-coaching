import { getAppointment, deleteAppointment, decrementUserVisit } from './firebase_v13.js';

document.addEventListener('DOMContentLoaded', () => {
    const cancelForm = document.getElementById('cancel-form');
    const msg = document.getElementById('cancel-message');
    const submitBtn = cancelForm.querySelector('button');

    cancelForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('appointment-id').value.trim();

        if (!id) return;

        msg.textContent = "Validando cita...";
        msg.className = "p-4 rounded-2xl text-xs font-semibold mb-4 bg-white/5 text-slate-400 animate-pulse";
        msg.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            const appointment = await getAppointment(id);

            if (!appointment) {
                msg.textContent = "No se encontró ninguna cita con ese ID. Por favor, verifica el código enviado a tu correo.";
                msg.className = "p-4 rounded-2xl text-xs font-semibold mb-4 bg-red-500/10 text-red-400";
                submitBtn.disabled = false;
                return;
            }

            // check 24h policy
            const appointmentDate = new Date(appointment.date + 'T' + appointment.time);
            const now = new Date();
            const diffMs = appointmentDate - now;
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours < 24) {
                msg.textContent = "Lo sentimos, según nuestra política de bienestar, las cancelaciones deben realizarse con al menos 24 horas de antelación. Por favor contáctanos directamente para casos excepcionales.";
                msg.className = "p-4 rounded-2xl text-xs font-semibold mb-4 bg-orange-500/10 text-orange-400";
                submitBtn.disabled = false;
                return;
            }

            // Proceed with deletion
            await deleteAppointment(appointment.docId, appointment.date, appointment.time);

            // LOGIC: Decrement visit count ONLY if cancelled on time
            if (appointment.phone) {
                await decrementUserVisit(appointment.phone);
                console.log("Visit count decremented for", appointment.phone);
            }

            msg.textContent = "¡Cita cancelada con éxito! Tu horario ha sido liberado para que otra persona pueda aprovecharlo. Esperamos verte pronto.";
            msg.className = "p-4 rounded-2xl text-xs font-semibold mb-4 bg-green-500/10 text-green-400";
            document.getElementById('appointment-id').value = '';

            // Clean up session storage if it was his own booking
            const lastBooking = JSON.parse(sessionStorage.getItem('lastBooking'));
            if (lastBooking && lastBooking.id === id) {
                sessionStorage.removeItem('lastBooking');
            }

        } catch (error) {
            console.error("CANCELLATION_ERROR:", error);
            msg.textContent = "Hubo un error al procesar la cancelación. Por favor verifica tu conexión e intenta de nuevo.";
            msg.className = "p-4 rounded-2xl text-xs font-semibold mb-4 bg-red-500/10 text-red-400";
            submitBtn.disabled = false;
        }
    };
});
