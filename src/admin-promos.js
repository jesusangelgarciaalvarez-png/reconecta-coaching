import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where } from "firebase/firestore";
import { initializeApp } from "firebase/app";

// Firebase configuration (sync with main firebase_v13.js)
const firebaseConfig = {
    apiKey: "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM",
    authDomain: "reconecta-ed650.firebaseapp.com",
    projectId: "reconecta-ed650",
    storageBucket: "reconecta-ed650.firebasestorage.app",
    messagingSenderId: "148326324396",
    appId: "1:148326324396:web:e4baa888d1b445055e2709"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    if (sessionStorage.getItem('reconecta_admin_auth') !== 'true') {
        window.location.href = '/admin.html';
        return;
    }

    const grid = document.getElementById('promos-grid');
    const saveBtn = document.getElementById('save-all-btn');
    const generateBtn = document.getElementById('generate-btn');
    const toast = document.getElementById('toast');

    const months = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();

    // Creative templates (no more than 25% discount)
    const suggestions = [
        "10% de descuento en tu primera sesión de este mes.",
        "Tu tercera sesión del mes es completamente gratis.",
        "Trae a una amiga y ambas reciben 20% de descuento.",
        "Sesión de diagnóstico extendida (90 min) al precio de 60 min.",
        "15% de descuento en paquetes de 4 sesiones.",
        "Regalo de una guía digital de meditación con tu reserva.",
        "Descuento flash del 25% reservando hoy mismo.",
        "Segunda sesión a mitad de precio este mes.",
        "Bonus: 15 minutos extra de relajación en todas las citas.",
        "5% de descuento directo si pagas tu paquete por adelantado.",
        "Promoción especial: 10% menos en sesiones matutinas.",
        "Este mes, tu sesión incluye un Journal Digital de regalo."
    ];

    async function loadPromotions() {
        grid.innerHTML = '';
        const promosRef = collection(db, "promotions");
        const querySnapshot = await getDocs(promosRef);
        const dataMap = {};
        querySnapshot.forEach(doc => dataMap[doc.id] = doc.data().text);

        // Generate cards for the next 12 months
        for (let i = 0; i < 12; i++) {
            const date = new Date();
            date.setMonth(currentMonthIdx + i);
            const year = date.getFullYear();
            const monthIdx = date.getMonth();
            const monthId = `${year}-${(monthIdx + 1).toString().padStart(2, '0')}`;
            const monthName = months[monthIdx];

            const card = document.createElement('div');
            card.className = 'month-card p-6 rounded-[2rem] flex flex-col gap-4';
            card.dataset.id = monthId;

            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-primary uppercase tracking-widest">${monthName} ${year}</span>
                    <span class="material-symbols-outlined text-white/20 text-sm">edit_note</span>
                </div>
                <textarea class="promo-input" placeholder="Escribe la promoción aquí..." rows="3">${dataMap[monthId] || ''}</textarea>
            `;

            grid.appendChild(card);
        }
    }

    function showToast(text) {
        toast.textContent = text;
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, 0)';
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translate(-50%, 1rem)';
        }, 3000);
    }

    saveBtn.onclick = async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = "Guardando...";

        const cards = document.querySelectorAll('.month-card');
        const promises = [];

        cards.forEach(card => {
            const id = card.dataset.id;
            const text = card.querySelector('textarea').value.trim();
            if (text) {
                promises.push(setDoc(doc(db, "promotions", id), { text, updatedAt: new Date() }));
            }
        });

        try {
            await Promise.all(promises);
            showToast("Promociones actualizadas con éxito");
        } catch (e) {
            showToast("Error al guardar cambios");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Guardar Todo";
        }
    };

    generateBtn.onclick = () => {
        const textareas = document.querySelectorAll('.promo-input');
        textareas.forEach(ta => {
            if (!ta.value.trim()) {
                const randomPromo = suggestions[Math.floor(Math.random() * suggestions.length)];
                ta.value = randomPromo;
                ta.parentElement.classList.add('animate-pulse');
                setTimeout(() => ta.parentElement.classList.remove('animate-pulse'), 1000);
            }
        });
        showToast("Sugerencias creativas generadas");
    };

    loadPromotions();
});
