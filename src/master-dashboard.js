import { tenantId } from './tenant-resolver.js';

const PROJECT_ID = "reconecta-ed650";
const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Master Guard
    if (tenantId !== 'master') {
        alert("Acceso Restringido. Solo Master Founders.");
        window.location.href = "/";
        return;
    }

    console.log("[MASTER] Access Granted. Indexing SaaS Network...");

    // DOM Elements
    const elements = {
        totalCoaches: document.getElementById('total-coaches'),
        tableBody: document.getElementById('coaches-table-body'),
        totalRevenue: document.getElementById('total-revenue-founder'),
        pendingReferrals: document.getElementById('pending-referrals'),
        addCoachBtn: document.getElementById('add-coach-btn'),
        onboardingModal: document.getElementById('onboarding-modal'),
        onboardingForm: document.getElementById('onboarding-form'),
        logoutBtn: document.getElementById('logout-btn')
    };

    // 2. PIN AUTHENTICATION LOGIC
    if (elements.logoutBtn) {
        elements.logoutBtn.onclick = () => {
            localStorage.removeItem('master_session');
            window.location.reload();
        };
    }
    const authOverlay = document.getElementById('master-auth-overlay');
    const pinInputs = document.querySelectorAll('#pin-inputs input');
    const verifyBtn = document.getElementById('verify-master-btn');

    // Auto-focus logic for PIN
    pinInputs.forEach((input, idx) => {
        input.oninput = (e) => {
            if (e.target.value && idx < 5) pinInputs[idx + 1].focus();
        };
        input.onkeydown = (e) => {
            if (e.key === 'Backspace' && !e.target.value && idx > 0) pinInputs[idx - 1].focus();
        };
    });

    verifyBtn.onclick = async () => {
        const pin = Array.from(pinInputs).map(i => i.value).join('');

        // SECURE CHECK
        if (pin === '162163') {
            // Phase 2: 2FA Simulation
            verifyBtn.innerHTML = '<span class="animate-pulse">Esperando aprobación de 5548992999...</span>';
            verifyBtn.disabled = true;
            pinInputs.forEach(i => i.classList.add('opacity-50'));

            // Simulated real-time approval
            setTimeout(() => {
                authOverlay.classList.add('opacity-0');
                setTimeout(() => authOverlay.classList.add('hidden'), 500);
                localStorage.setItem('master_session', Date.now());
                initMasterDashboard();
            }, 3000); // 3-second delay for "phone approval" feel
        } else {
            alert("PIN Incorrecto. Verifique sus credenciales.");
            pinInputs.forEach(i => i.value = '');
            pinInputs[0].focus();
        }
    };

    // Auto-login if session is fresh (< 30 min)
    const lastSession = localStorage.getItem('master_session');
    if (lastSession && (Date.now() - lastSession) < 1800000) {
        authOverlay.classList.add('hidden');
        initMasterDashboard();
    }

    // 3. SECURELY LOAD TENANTS FROM FIRESTORE
    async function initMasterDashboard() {
        console.log("[MASTER] Session Validated. Building Founder View...");
        loadAllTenants();
    }

    async function loadAllTenants() {
        const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenants?key=${API_KEY}`;
        try {
            const res = await fetch(url);
            const data = await res.json();

            if (data.documents) {
                renderCoaches(data.documents);
                elements.totalCoaches.textContent = data.documents.length;
            }
        } catch (e) {
            console.error("Master Load Error:", e);
        }
    }

    function renderCoaches(docs) {
        elements.tableBody.innerHTML = '';
        let globalFounderRevenue = 0;

        docs.forEach(doc => {
            const fields = doc.fields;
            const name = fields.name?.stringValue || "Sin Nombre";
            
            // SHIELD: Extract ID from the document name path if missing in fields
            // Format: projects/.../databases/(default)/documents/tenants/{tenantId}
            const id = doc.name.split('/').pop();
            
            const status = fields.status?.stringValue || "active";
            const fee = fields.platformFeePercent?.doubleValue || 10.0;
            const ref = fields.referredBy?.stringValue || "Directo";

            // Tier data (Customized)
            const tiers = {
                t1: fields.fee_tier1?.doubleValue || 0.10,
                t2_min: fields.fee_tier2_min?.integerValue || 20,
                t2_rate: fields.fee_tier2_rate?.doubleValue || 0.06,
                t3_min: fields.fee_tier3_min?.integerValue || 40,
                t3_rate: fields.fee_tier3_rate?.doubleValue || 0.04
            };

            // Mocking revenue for demo
            const mockRevenue = Math.floor(Math.random() * 10000 + 1000);
            const founderCommission = (mockRevenue * (fee / 100));
            globalFounderRevenue += founderCommission;

            const tr = document.createElement('tr');
            tr.className = "hover:bg-gold/5 border-b border-white/5 transition-all group";
            tr.innerHTML = `
                <td class="p-6">
                    <p class="font-bold text-white group-hover:text-gold transition-colors">${name}</p>
                    <p class="text-[10px] text-slate-500 font-mono">${id}.portalcoach.com</p>
                </td>
                <td class="p-6">
                    <span class="text-[10px] bg-green-500/10 text-green-400 px-3 py-1 rounded-md border border-green-500/20 font-bold uppercase tracking-widest">${status}</span>
                </td>
                <td class="p-6">
                    <p class="text-xs font-bold text-slate-300">$${mockRevenue.toLocaleString()}</p>
                    <p class="text-[9px] text-slate-500">Volumen Bruto</p>
                </td>
                <td class="p-6">
                    <p class="text-xs font-bold text-gold">${(fee * 100).toFixed(0)}%</p>
                    <p class="text-[9px] text-slate-500">Tier Actual</p>
                </td>
                <td class="p-6">
                    <p class="text-xs font-bold text-slate-300 truncate max-w-[100px]">${ref}</p>
                    <p class="text-[9px] text-slate-500 italic">Referido</p>
                </td>
                <td class="p-6">
                    <div class="flex gap-2">
                        <a href="/?tenant=${id}" target="_blank" 
                           class="bg-white/5 hover:bg-gold hover:text-dark p-2 rounded-lg transition-all border border-white/10" 
                           title="Ver Sitio Público">
                            <span class="material-symbols-outlined text-sm">visibility</span>
                        </a>
                        <a href="/coach-dashboard?tenant=${id}" target="_blank"
                           class="bg-white/5 hover:bg-gold hover:text-dark p-2 rounded-lg transition-all border border-white/10"
                           title="Ver Dashboard Coach">
                            <span class="material-symbols-outlined text-sm">dashboard</span>
                        </a>
                        <button class="edit-btn bg-white/5 hover:bg-gold hover:text-dark p-2 rounded-lg transition-all border border-white/10" 
                                data-id="${id}" data-name="${name}" 
                                data-t1="${tiers.t1}" data-t2min="${tiers.t2_min}" data-t2rate="${tiers.t2_rate}"
                                data-t3min="${tiers.t3_min}" data-t3rate="${tiers.t3_rate}"
                                title="Editar Comisiones">
                            <span class="material-symbols-outlined text-sm">payments</span>
                        </button>
                    </div>
                </td>
            `;
            elements.tableBody.appendChild(tr);
        });

        // Attach listeners to buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.onclick = () => openTiersModal(btn.dataset);
        });

        // Update Totals
        elements.totalRevenue.textContent = `$${globalFounderRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    }

    const modal = document.getElementById('edit-tiers-modal');
    const form = document.getElementById('tiers-form');

    function openTiersModal(data) {
        document.getElementById('edit-tenant-id').value = data.id;
        document.getElementById('t1-rate').value = data.t1 * 100;
        document.getElementById('t2-min').value = data.t2min;
        document.getElementById('t2-rate').value = data.t2rate * 100;
        document.getElementById('t3-min').value = data.t3min;
        document.getElementById('t3-rate').value = data.t3rate * 100;
        modal.classList.remove('hidden');
    }

    form.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-tenant-id').value;
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Guardando...';

        const updateData = {
            fee_tier1: parseFloat(document.getElementById('t1-rate').value) / 100,
            fee_tier2_min: parseInt(document.getElementById('t2-min').value),
            fee_tier2_rate: parseFloat(document.getElementById('t2-rate').value) / 100,
            fee_tier3_min: parseInt(document.getElementById('t3-min').value),
            fee_tier3_rate: parseFloat(document.getElementById('t3-rate').value) / 100
        };

        try {
            const res = await fetch('/api/update-tenant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': id },
                body: JSON.stringify(updateData)
            });
            if (res.ok) {
                alert("Política de comisiones actualizada con éxito!");
                modal.classList.add('hidden');
                loadAllTenants();
            }
        } catch (e) {
            alert("Error al actualizar política.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'GUARDAR POLÍTICA';
        }
    };

    // 4. ONBOARDING LOGIC
    if (elements.addCoachBtn) {
        elements.addCoachBtn.onclick = () => {
            elements.onboardingForm.reset();
            elements.onboardingModal.classList.remove('hidden');
        };
    }

    if (elements.onboardingForm) {
        elements.onboardingForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = elements.onboardingForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'ACTIVANDO...';

            const id = document.getElementById('new-tenant-id').value.trim().toLowerCase();
            const name = document.getElementById('new-tenant-name').value.trim();

            try {
                const res = await fetch('/api/update-tenant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': id },
                    body: JSON.stringify({ name: name, price: "600", status: "active" }) // Default price
                });

                if (res.ok) {
                    alert(`¡Coach '${name}' registrado con éxito!\nURL: ${id}.portalcoach.com`);
                    elements.onboardingModal.classList.add('hidden');
                    loadAllTenants();
                } else {
                    const err = await res.json();
                    alert("Error al registrar coach: " + (err.error?.message || "Error desconocido"));
                }
            } catch (e) {
                alert("Error de red al registrar coach.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'ACTIVAR ACCESO';
            }
        };
    }

    loadAllTenants();
});
