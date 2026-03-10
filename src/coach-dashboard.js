import { tenantId } from './tenant-resolver.js';
import { getTenantMetadata } from './firebase_v13.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log(`[DASHBOARD] Booting for tenant: ${tenantId}...`);

    // --- SESSION BRIDGE HELPER ---
    window.establishBridge = () => {
        console.log("[SECURITY] Establishing bridge for administration modules.");
        sessionStorage.setItem('reconecta_admin_auth', 'true');
        localStorage.setItem('reconecta_admin_auth', 'true');
    };

    // --- SESSION BRIDGE ---
    const checkAuth = () => {
        if (sessionStorage.getItem(`pc_auth_${tenantId}`) === 'true' || localStorage.getItem(`pc_auth_${tenantId}`) === 'true') return true;
        const ms = localStorage.getItem('master_session');
        if (ms && (Date.now() - parseInt(ms)) < 1800000) return true;
        return false;
    };

    if (checkAuth()) {
        window.establishBridge();
    }

    // DOM Elements Mapping
    const elements = {
        connectStripeBtn: document.getElementById('connect-stripe-btn'),
        welcomeMsg: document.getElementById('welcome-msg'),
        coachName: document.getElementById('coach-name-display'),
        basePriceInput: document.getElementById('base-price'),
        savePriceBtn: document.getElementById('save-price-btn'),
        stripeStatusText: document.getElementById('stripe-status-text'),
        stripeLogo: document.getElementById('stripe-logo'),
        brandingForm: {
            name: document.getElementById('brand-name-input'),
            tagline: document.getElementById('brand-tagline-input'),
            phone: document.getElementById('contact-phone-input'),
            email: document.getElementById('contact-email-input'),
            street: document.getElementById('address-street'),
            colonia: document.getElementById('address-colonia'),
            state: document.getElementById('address-state'),
            zip: document.getElementById('address-zip'),
            photoInput: document.getElementById('photo-upload'),
            photoPreview: document.getElementById('profile-preview-img'),
            photoIcon: document.getElementById('profile-preview-icon'),
            accentColor: document.getElementById('accent-color-input'),
            saveBtn: document.getElementById('save-branding-btn'),
            previewPortalBtn: document.getElementById('preview-portal-btn')
        }
    };

    const mainHeader = document.querySelector('header.mb-12');
    const tabs = {
        setupNav: document.getElementById('nav-setup'),
        adminNav: document.getElementById('nav-admin'),
        setupSection: document.getElementById('setup-section'),
        adminSection: document.getElementById('admin-section')
    };

    function showTab(tabName) {
        if (!tabs.setupNav) return;

        // Reset Nav
        [tabs.setupNav, tabs.adminNav].forEach(link => {
            if (!link) return;
            link.classList.remove('text-primary', 'bg-primary/10');
            link.classList.add('text-slate-400');
            link.classList.remove('hover:bg-white/5');
        });
        // Hide Sections
        [tabs.setupSection, tabs.adminSection].forEach(sec => {
            if (sec) sec.classList.add('hidden');
        });

        const nav = tabs[`${tabName}Nav`];
        const sec = tabs[`${tabName}Section`];

        if (nav && sec) {
            nav.classList.add('text-primary', 'bg-primary/10');
            nav.classList.remove('text-slate-400');
            sec.classList.remove('hidden');
        }

        if (tabName === 'admin') {
            if (mainHeader) mainHeader.classList.add('hidden');
        } else {
            if (mainHeader) mainHeader.classList.remove('hidden');
        }
    }

    if (tabs.setupNav) tabs.setupNav.onclick = (e) => { e.preventDefault(); showTab('setup'); };
    if (tabs.adminNav) tabs.adminNav.onclick = (e) => { e.preventDefault(); showTab('admin'); };

    // Card Listeners (Setup Section)
    const goToSchedule = (e) => {
        if (e) e.preventDefault();
        window.location.href = `admin-schedule.html?tenant=${tenantId}`;
    };
    const setupCardSchedule = document.getElementById('setup-card-schedule');
    const setupCardPromos = document.getElementById('setup-card-promos');

    if (setupCardSchedule) setupCardSchedule.onclick = goToSchedule;
    if (setupCardPromos) {
        setupCardPromos.onclick = () => window.location.href = `admin-promos.html?tenant=${tenantId}`;
    }

    // 1. Load Metadata
    try {
        const metadata = await getTenantMetadata();

        // PIN Security
        const authKey = `pc_auth_${tenantId}`;
        const pinOverlay = document.getElementById('pin-overlay');
        const pinInputs = document.querySelectorAll('.pin-input');
        if (metadata.pin && sessionStorage.getItem(authKey) !== 'true') {
            pinOverlay.classList.remove('hidden');
            pinInputs.forEach((input, index) => {
                input.oninput = (e) => {
                    if (e.target.value && index < pinInputs.length - 1) pinInputs[index + 1].focus();
                    if (Array.from(pinInputs).every(i => i.value.length === 1)) {
                        const enteredPin = Array.from(pinInputs).map(i => i.value).join('');
                        if (enteredPin === metadata.pin) {
                            sessionStorage.setItem(authKey, 'true');
                            window.establishBridge();
                            pinOverlay.style.opacity = '0';
                            setTimeout(() => pinOverlay.classList.add('hidden'), 500);
                        } else {
                            document.getElementById('pin-error').classList.remove('hidden');
                            pinInputs.forEach(i => i.value = '');
                            pinInputs[0].focus();
                        }
                    }
                };
            });
        }

        // Sidebar Info
        const avatarImg = document.getElementById('coach-avatar-img');
        const avatarIcon = document.getElementById('coach-avatar-icon');
        const sideName = document.getElementById('coach-name-display');

        if (metadata.coachPhoto) {
            avatarImg.src = metadata.coachPhoto;
            avatarImg.classList.remove('hidden');
            avatarIcon.classList.add('hidden');
            elements.brandingForm.photoPreview.src = metadata.coachPhoto;
            elements.brandingForm.photoPreview.classList.remove('hidden');
            elements.brandingForm.photoIcon.classList.add('hidden');
        }
        sideName.textContent = metadata.name || tenantId;
        if (elements.welcomeMsg) elements.welcomeMsg.textContent = `Buenas tardes, ${metadata.name?.split(' ')[0] || tenantId}`;

        // Form Fields
        elements.basePriceInput.value = metadata.price || 600;
        elements.brandingForm.name.value = metadata.name || '';
        elements.brandingForm.tagline.value = metadata.tagline || '';
        elements.brandingForm.phone.value = metadata.phone || '';
        elements.brandingForm.email.value = metadata.email || '';
        elements.brandingForm.street.value = metadata.street || '';
        elements.brandingForm.colonia.value = metadata.colonia || '';
        elements.brandingForm.state.value = metadata.state || '';
        elements.brandingForm.zip.value = metadata.zipCode || '';

        // Photo Initialization
        if (metadata.coachPhoto) {
            elements.brandingForm.photoPreview.src = metadata.coachPhoto;
            elements.brandingForm.photoPreview.classList.remove('hidden');
            elements.brandingForm.photoIcon.classList.add('hidden');
        }

        const accentColor = metadata.accentColor || '#2dd4bf';
        elements.brandingForm.accentColor.value = accentColor;

        // Update Color Preview
        const colorPreview = document.getElementById('color-preview');
        const colorHex = document.getElementById('color-hex-display');
        if (colorPreview) colorPreview.style.backgroundColor = accentColor;
        if (colorHex) colorHex.textContent = accentColor.toUpperCase();

        // Stripe State (Sandbox Mode Override)
        elements.stripeStatusText.textContent = "Sandbox Mode Active";
        elements.stripeLogo.classList.remove('grayscale', 'opacity-50');
        if (elements.connectStripeBtn) elements.connectStripeBtn.textContent = "Ver Sandbox";

    } catch (e) {
        console.error("Dashboard Load Error:", e);
    }

    // Phone Formatting Logic
    const formatPhone = (val) => {
        const cleaned = ('' + val).replace(/\D/g, '');
        if (cleaned.length === 0) return '';
        if (cleaned.length <= 2) return cleaned;
        if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6, 10)}`;
    };

    if (elements.brandingForm.accentColor) {
        elements.brandingForm.accentColor.addEventListener('input', (e) => {
            const color = e.target.value;
            const preview = document.getElementById('color-preview');
            const hex = document.getElementById('color-hex-display');
            if (preview) {
                preview.style.backgroundColor = color;
                preview.style.boxShadow = `0 0 20px ${color}4D`; // 30% opacity glow
            }
            if (hex) hex.textContent = color.toUpperCase();
        });
    }

    if (elements.brandingForm.phone) {
        elements.brandingForm.phone.addEventListener('input', (e) => {
            const cursorPosition = e.target.selectionStart;
            const oldValue = e.target.value;
            const formatted = formatPhone(oldValue);

            e.target.value = formatted;

            // Simple cursor logic for better UX
            if (cursorPosition < oldValue.length) {
                e.target.setSelectionRange(cursorPosition, cursorPosition);
            }
        });
    }

    // Handlers
    elements.brandingForm.photoInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (re) => {
                const base64 = re.target.result;
                elements.brandingForm.photoPreview.src = base64;
                elements.brandingForm.photoPreview.classList.remove('hidden');
                elements.brandingForm.photoIcon.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    };

    elements.brandingForm.saveBtn.onclick = async () => {
        elements.brandingForm.saveBtn.disabled = true;
        elements.brandingForm.saveBtn.textContent = 'Guardando...';
        const data = {
            name: elements.brandingForm.name.value,
            tagline: elements.brandingForm.tagline.value,
            phone: elements.brandingForm.phone.value,
            email: elements.brandingForm.email.value,
            street: elements.brandingForm.street.value,
            colonia: elements.brandingForm.colonia.value,
            state: elements.brandingForm.state.value,
            zipCode: elements.brandingForm.zip.value,
            accentColor: elements.brandingForm.accentColor.value,
            coachPhoto: elements.brandingForm.photoPreview.src
        };
        console.log("[DASHBOARD] Saving branding data:", data);
        try {
            const resp = await fetch('/api/update-tenant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
                body: JSON.stringify(data)
            });
            const result = await resp.json();
            if (result.success) {
                alert("¡Perfil actualizado con éxito!");
            } else {
                throw new Error(result.error || "Server error");
            }
        } catch (e) {
            console.error("Save Error:", e);
            alert("Error al guardar: " + e.message);
        }
        elements.brandingForm.saveBtn.disabled = false;
        elements.brandingForm.saveBtn.textContent = 'Publicar Identidad';
    };

    elements.savePriceBtn.onclick = async () => {
        elements.savePriceBtn.disabled = true;
        try {
            await fetch('/api/update-tenant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
                body: JSON.stringify({ price: elements.basePriceInput.value })
            });
            alert("Precio actualizado");
        } catch (e) { alert("Error"); }
        elements.savePriceBtn.disabled = false;
    };

    // Admin Cards
    const qrCard = document.getElementById('admin-card-qr');
    const statsCard = document.getElementById('admin-card-stats');
    const bookingCard = document.getElementById('admin-card-booking');
    if (qrCard) qrCard.onclick = () => window.location.href = `admin-qr.html?tenant=${tenantId}`;
    if (statsCard) statsCard.onclick = () => window.location.href = `admin-stats.html?tenant=${tenantId}`;
    if (bookingCard) bookingCard.onclick = () => window.location.href = `admin-booking.html?tenant=${tenantId}`;

    // Sharing
    const fullUrl = `https://${tenantId}.portalcoach.com`;
    document.getElementById('share-link-val').value = `${tenantId}.portalcoach.com`;
    document.getElementById('copy-link-btn').onclick = () => {
        navigator.clipboard.writeText(fullUrl).then(() => {
            alert("Link copiado!");
        });
    };
    document.getElementById('share-whatsapp-btn').onclick = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent('Agenda conmigo: ' + fullUrl)}`, '_blank');
    };
    document.getElementById('share-gmail-btn').onclick = () => {
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=Mi Portal&body=${encodeURIComponent(fullUrl)}`, '_blank');
    };

    document.getElementById('logout-btn').onclick = () => {
        sessionStorage.removeItem(`pc_auth_${tenantId}`);
        location.reload();
    };

    showTab('setup');
});
