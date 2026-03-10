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
            themeSelector: document.getElementById('theme-selector'),
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
    const setupCardBuilder = document.getElementById('setup-card-builder');

    if (setupCardSchedule) setupCardSchedule.onclick = goToSchedule;
    if (setupCardPromos) {
        setupCardPromos.onclick = () => window.location.href = `admin-promos.html?tenant=${tenantId}`;
    }
    if (setupCardBuilder) {
        setupCardBuilder.onclick = () => window.location.href = `admin-builder.html?tenant=${tenantId}`;
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
        if (elements.welcomeMsg) elements.welcomeMsg.textContent = `Buenas tardes, ${metadata.name?.split(' ')[0] || 'Coach'}`;

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

        const currentTheme = metadata.theme || 'nature';
        window.selectedTheme = currentTheme;
        updateThemeUI(currentTheme);

        // Stripe State (Sandbox Mode Override)
        elements.stripeStatusText.textContent = "Sandbox Mode Active";
        elements.stripeLogo.classList.remove('grayscale', 'opacity-50');
        if (elements.connectStripeBtn) elements.connectStripeBtn.textContent = "Ver Sandbox";


    } catch (e) {
        console.error("Dashboard Load Error:", e);
    }

    // --- PHOTO OPTIMIZATION HELPER ---
    const compressImage = async (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
            };
        });
    };

    function updateThemeUI(theme) {
        document.querySelectorAll('.theme-option').forEach(opt => {
            if (opt.dataset.theme === theme) {
                opt.classList.add('selected');
                // Instant Feedback in Dashboard
                const colors = {
                    'nature': '#10b981',
                    'premium': '#fbbf24',
                    'sunset': '#fb7185',
                    'cosmic': '#a855f7',
                    'zen': '#6b7280',
                    'executive': '#1e40af'
                };
                document.documentElement.style.setProperty('--primary-color', colors[theme] || '#1e40af');
            } else {
                opt.classList.remove('selected');
            }
        });
    }

    // --- AUTO-DRAFTING ---
    const saveDraft = () => {
        const d = {
            name: elements.brandingForm.name.value,
            tagline: elements.brandingForm.tagline.value,
            phone: elements.brandingForm.phone.value,
            email: elements.brandingForm.email.value,
            street: elements.brandingForm.street.value,
            colonia: elements.brandingForm.colonia.value,
            state: elements.brandingForm.state.value,
            zip: elements.brandingForm.zip.value,
            theme: window.selectedTheme || 'nature',
            coachPhoto: elements.brandingForm.photoPreview.src
        };
        localStorage.setItem(`pc_draft_${tenantId}`, JSON.stringify(d));
        console.log("[DASHBOARD] Local draft updated.");
    };

    // Phone Formatting Logic
    const formatPhone = (val) => {
        const cleaned = ('' + val).replace(/\D/g, '');
        if (cleaned.length === 0) return '';
        if (cleaned.length <= 2) return cleaned;
        if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6, 10)}`;
    };


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
    elements.brandingForm.photoInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            elements.brandingForm.saveBtn.disabled = true;
            elements.brandingForm.saveBtn.textContent = 'Procesando Imagen...';

            try {
                const compressedBase64 = await compressImage(file);
                elements.brandingForm.photoPreview.src = compressedBase64;
                elements.brandingForm.photoPreview.classList.remove('hidden');
                elements.brandingForm.photoIcon.classList.add('hidden');
                saveDraft(); // Save draft after photo processing
            } catch (err) {
                console.error("Compression Error:", err);
                alert("Error al procesar la imagen.");
            }

            elements.brandingForm.saveBtn.textContent = 'Publicar Identidad';
        }
    };

    const inputs = [
        elements.brandingForm.name, elements.brandingForm.tagline,
        elements.brandingForm.phone, elements.brandingForm.email,
        elements.brandingForm.street, elements.brandingForm.colonia,
        elements.brandingForm.state, elements.brandingForm.zip
    ];
    inputs.forEach(input => {
        if (input) input.addEventListener('input', saveDraft);
    });

    // --- UI LISTENERS (v43.7) ---
    // 1. Theme Selection
    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(opt => {
        opt.onclick = () => {
            console.log("[DASHBOARD] Theme selected:", opt.dataset.theme);
            window.selectedTheme = opt.dataset.theme;
            updateThemeUI(window.selectedTheme);
            saveDraft();
        };
    });

    // 2. Draft Restoral (Moved here for better timing)
    const restoreDraft = () => {
        const draft = localStorage.getItem(`pc_draft_${tenantId}`);
        if (draft) {
            console.log("[DASHBOARD] Restoring local draft...");
            const d = JSON.parse(draft);
            if (d.name) elements.brandingForm.name.value = d.name;
            if (d.tagline) elements.brandingForm.tagline.value = d.tagline;
            if (d.phone) elements.brandingForm.phone.value = d.phone;
            if (d.email) elements.brandingForm.email.value = d.email;
            if (d.street) elements.brandingForm.street.value = d.street;
            if (d.colonia) elements.brandingForm.colonia.value = d.colonia;
            if (d.state) elements.brandingForm.state.value = d.state;
            if (d.zipCode || d.zip) elements.brandingForm.zip.value = d.zipCode || d.zip;
            if (d.theme) {
                window.selectedTheme = d.theme;
                updateThemeUI(d.theme);
            }
            if (d.coachPhoto) {
                elements.brandingForm.photoPreview.src = d.coachPhoto;
                elements.brandingForm.photoPreview.classList.remove('hidden');
                elements.brandingForm.photoIcon.classList.add('hidden');
            }
        }
    };
    restoreDraft();

    // 3. Publish Button
    elements.brandingForm.saveBtn.onclick = async () => {
        elements.brandingForm.saveBtn.disabled = true;
        const originalText = elements.brandingForm.saveBtn.innerHTML;
        elements.brandingForm.saveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Guardando...';

        const data = {
            name: elements.brandingForm.name.value,
            tagline: elements.brandingForm.tagline.value,
            phone: elements.brandingForm.phone.value,
            email: elements.brandingForm.email.value,
            street: elements.brandingForm.street.value,
            colonia: elements.brandingForm.colonia.value,
            state: elements.brandingForm.state.value,
            zipCode: elements.brandingForm.zip.value,
            theme: window.selectedTheme || 'nature',
            coachPhoto: elements.brandingForm.photoPreview.src
        };

        try {
            const resp = await fetch('/api/update-tenant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenantId },
                body: JSON.stringify(data)
            });
            const result = await resp.json();
            if (result.success) {
                localStorage.removeItem(`pc_draft_${tenantId}`);
                alert("¡Perfil actualizado con éxito en la nube!");
            } else {
                throw new Error(result.error || "Server error");
            }
        } catch (e) {
            console.error("Save Error:", e);
            alert("Error al guardar: " + e.message);
        }
        elements.brandingForm.saveBtn.disabled = false;
        elements.brandingForm.saveBtn.innerHTML = originalText;
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

    // --- AUTO-SAVE TRIGGERS ---
    window.saveDraft = saveDraft;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') saveDraft();
    });
    window.addEventListener('beforeunload', saveDraft);

    showTab('setup');
});
