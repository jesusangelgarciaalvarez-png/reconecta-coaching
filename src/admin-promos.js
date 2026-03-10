import { tenantId } from './tenant-resolver.js';
import { getTenantMetadata, db } from './firebase_v13.js';
import { collection, getDocs, setDoc, doc } from "firebase/firestore";

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check (Reuses dashboard check)
    const checkAuth = () => {
        if (sessionStorage.getItem(`pc_auth_${tenantId}`) === 'true' || localStorage.getItem(`pc_auth_${tenantId}`) === 'true') return true;
        const ms = localStorage.getItem('master_session');
        if (ms && (Date.now() - parseInt(ms)) < 1800000) return true;
        return false;
    };

    if (!checkAuth() && tenantId !== 'test') {
        window.location.href = `coach-dashboard.html?tenant=${tenantId}`;
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
        try {
            const promosRef = collection(db, "tenants", tenantId, "promotions");
            const querySnapshot = await getDocs(promosRef);
            const dataMap = {};
            querySnapshot.forEach(doc => dataMap[doc.id] = doc.data());

            // Load tenant defaults
            let basePrice = 600;
            try {
                const metadata = await getTenantMetadata();
                if (metadata && metadata.price) basePrice = metadata.price;
            } catch (e) {
                console.warn("Metadata load failed, using default price:", e);
            }

            grid.innerHTML = '';
            // Generate cards for the next 12 months
            for (let i = 0; i < 12; i++) {
                const date = new Date();
                date.setMonth(currentMonthIdx + i);
                const year = date.getFullYear();
                const monthIdx = date.getMonth();
                const monthId = `${year}-${(monthIdx + 1).toString().padStart(2, '0')}`;
                const monthName = months[monthIdx];

                const card = document.createElement('div');
                card.className = 'month-card glass-panel p-6 rounded-[2.5rem] flex flex-col gap-4 border-white/5';
                card.dataset.id = monthId;

                card.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-[10px] font-black text-primary uppercase tracking-[0.2em]">${monthName} ${year}</span>
                        <span class="material-symbols-outlined text-white/20 text-sm">auto_awesome</span>
                    </div>
                    <div class="space-y-4">
                        <div class="relative">
                            <textarea class="promo-input" placeholder="Promoción del mes..." rows="3">${dataMap[monthId]?.text || ''}</textarea>
                        </div>
                    </div>
                    <div class="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
                        <span class="material-symbols-outlined text-primary text-xs">payments</span>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] text-slate-500 font-bold">$</span>
                            <input type="number" class="price-input bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white w-20 text-right focus:border-primary/50 outline-none" 
                                   placeholder="600" value="${dataMap[monthId]?.price || basePrice}">
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            }
        } catch (error) {
            console.error("Error loading promotions:", error);
            grid.innerHTML = `<div class="col-span-full text-center py-20 text-red-400">Error al cargar datos. Actualiza la página.</div>`;
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
        saveBtn.textContent = "Publicando...";

        const cards = document.querySelectorAll('.month-card');
        const promises = [];

        cards.forEach(card => {
            const id = card.dataset.id;
            const text = card.querySelector('.promo-input').value.trim();
            const price = card.querySelector('.price-input').value.trim();

            if (text || price) {
                promises.push(setDoc(doc(db, "tenants", tenantId, "promotions", id), {
                    text: text || '',
                    price: price || '0',
                    updatedAt: new Date()
                }, { merge: true }));
            }
        });

        try {
            await Promise.all(promises);
            showToast("CALENDARIO ACTUALIZADO");
        } catch (e) {
            showToast("ERROR AL GUARDAR");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Guardar Calendario";
        }
    };

    generateBtn.onclick = () => {
        const textareas = document.querySelectorAll('.promo-input');
        textareas.forEach(ta => {
            if (!ta.value.trim()) {
                const randomPromo = suggestions[Math.floor(Math.random() * suggestions.length)];
                ta.value = randomPromo;
            }
        });
        showToast("IDEAS GENERADAS");
    };

    loadPromotions();
});
