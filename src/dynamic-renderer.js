/**
 * PORTALCOACH - DYNAMIC RENDER ENGINE
 * Handles dynamic navigation buttons and SPA-style page content.
 */

const DYNAMIC_CONFIG = {
    fixedButtons: [
        { id: 'conocenos', label: 'Conócenos', icon: 'visibility', pageId: 'mision' },
        { id: 'reservar', label: 'Reservar Cita', icon: 'event', url: '/reservar.html' },
        { id: 'cancelar', label: 'Cancelar Cita', icon: 'event_busy', url: '/cancel.html', colorClass: 'group-hover:bg-red-400 group-hover:text-white' }
    ],
    dynamicButtons: [
        { id: 'mision', label: 'Misión', icon: 'center_focus_strong' },
        { id: 'servicios', label: 'Servicios', icon: 'hub' },
        { id: 'metodo', label: 'Método', icon: 'spa' }
    ]
};

async function initDynamicRenderer() {
    const navGrid = document.getElementById('dynamic-nav-grid');
    const subpageContainer = document.getElementById('subpage-container');
    const backBtn = document.getElementById('back-to-home');
    const heroTitle = document.getElementById('hero-title');
    const heroSubtitle = document.getElementById('hero-subtitle');
    const coachPhoto = document.getElementById('home-coach-photo-container');

    if (!navGrid) return;

    // 1. Resolve Subdomain (Tenant)
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    let subdomain = parts[0];

    if (subdomain === 'www' || subdomain === 'portalcoach' || subdomain === 'localhost') {
        subdomain = 'test'; // Fallback for local testing if needed
    }

    try {
        const res = await fetch(`/api/sitios?subdominio=${subdomain}`);
        if (!res.ok) throw new Error("Sitio no configurado");
        const config = await res.json();

        renderButtons(config, navGrid, subpageContainer, heroTitle, heroSubtitle, coachPhoto);
        setupBackNavigation(navGrid, subpageContainer, heroTitle, heroSubtitle, backBtn, coachPhoto);

    } catch (err) {
        console.error("[DYNAMIC RENDERER ERROR]:", err);
        // Fallback: Render only fixed buttons if fetch fails
        renderButtons({ paginas: {} }, navGrid, subpageContainer, heroTitle, heroSubtitle, coachPhoto);
    }
}

function renderButtons(config, navGrid, subpageContainer, heroTitle, heroSubtitle, coachPhoto) {
    navGrid.innerHTML = '';
    const paginas = config.paginas || {};

    // 1. Conócenos (Fixed - Points to Misión content by default)
    addLink(navGrid, DYNAMIC_CONFIG.fixedButtons[0], () => showDynamicPage('mision', config, navGrid, subpageContainer, heroTitle, heroSubtitle, coachPhoto));

    // 2. Misión (Dynamic - Only if has rich content)
    if (paginas.mision?.secciones?.length > 1) { // If more than 1 section, show separate Mission
        addLink(navGrid, DYNAMIC_CONFIG.dynamicButtons[0], () => showDynamicPage('mision', config, navGrid, subpageContainer, heroTitle, heroSubtitle, coachPhoto));
    }

    // 3. Servicios (Dynamic)
    if (paginas.servicios?.secciones?.length > 0) {
        addLink(navGrid, DYNAMIC_CONFIG.dynamicButtons[1], () => showDynamicPage('servicios', config, navGrid, subpageContainer, heroTitle, heroSubtitle, coachPhoto));
    }

    // 4. Método (Dynamic)
    if (paginas.metodo?.secciones?.length > 0) {
        addLink(navGrid, DYNAMIC_CONFIG.dynamicButtons[2], () => showDynamicPage('metodo', config, navGrid, subpageContainer, heroTitle, heroSubtitle, coachPhoto));
    }

    // 5. Reservar Cita (Fixed)
    addLink(navGrid, DYNAMIC_CONFIG.fixedButtons[1], null, DYNAMIC_CONFIG.fixedButtons[1].url);

    // 6. Cancelar Cita (Fixed)
    addLink(navGrid, DYNAMIC_CONFIG.fixedButtons[2], null, DYNAMIC_CONFIG.fixedButtons[2].url);
}

function addLink(container, btn, onClick, url = null) {
    const el = document.createElement(url ? 'a' : 'button');
    if (url) el.href = url;
    el.className = `glass-panel group p-6 rounded-[2rem] border-white/10 hover:border-primary/50 transition-all duration-500 hover:scale-[1.05] active:scale-95 no-underline flex flex-col items-center text-center w-full`;

    const colorClass = btn.colorClass || 'group-hover:bg-primary group-hover:text-[#0a1f1f]';
    const bgClass = btn.id === 'reservar' ? 'bg-primary/20' : 'bg-white/5';

    el.innerHTML = `
        <div class="w-12 h-12 ${bgClass} rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 border border-white/10 ${colorClass}">
            <span class="material-symbols-outlined">${btn.icon}</span>
        </div>
        <span class="text-white font-bold text-sm tracking-wide">${btn.label}</span>
    `;

    if (onClick) el.onclick = onClick;
    container.appendChild(el);
}

function showDynamicPage(pageId, config, navGrid, subpageContainer, heroTitle, heroSubtitle, coachPhoto) {
    // Hide Hero, Nav Grid and Photo
    heroTitle.classList.add('opacity-0', 'scale-95');
    heroSubtitle.classList.add('opacity-0', 'scale-95');
    if (coachPhoto) coachPhoto.classList.add('opacity-0', 'scale-95');
    navGrid.classList.add('opacity-0', 'scale-95', 'pointer-events-none');

    setTimeout(() => {
        heroTitle.classList.add('hidden');
        heroSubtitle.classList.add('hidden');
        if (coachPhoto) coachPhoto.classList.add('hidden');
        navGrid.classList.add('hidden');

        // Render Page Content
        const sectionsContainer = document.getElementById('contenedor-secciones');
        sectionsContainer.innerHTML = '';

        const page = config.paginas[pageId];
        if (page && page.secciones) {
            page.secciones.forEach(sec => {
                const html = renderComponent(sec);
                sectionsContainer.insertAdjacentHTML('beforeend', html);
            });
        }

        subpageContainer.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 400);
}

function setupBackNavigation(navGrid, subpageContainer, heroTitle, heroSubtitle, backBtn, coachPhoto) {
    backBtn.onclick = () => {
        subpageContainer.classList.add('hidden');

        heroTitle.classList.remove('hidden');
        heroSubtitle.classList.remove('hidden');
        if (coachPhoto) coachPhoto.classList.remove('hidden');
        navGrid.classList.remove('hidden');

        setTimeout(() => {
            heroTitle.classList.remove('opacity-0', 'scale-95');
            heroSubtitle.classList.remove('opacity-0', 'scale-95');
            if (coachPhoto) coachPhoto.classList.remove('opacity-0', 'scale-95');
            navGrid.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
        }, 50);
    };
}

function renderComponent(section) {
    const { tipo, titulo, contenido } = section;

    switch (tipo) {
        case 'hero':
            return `
                <section class="py-16 px-6 text-center bg-white/5 rounded-3xl border border-white/10">
                    <h2 class="text-4xl md:text-5xl font-display italic text-white mb-6">${titulo}</h2>
                    <p class="max-w-2xl mx-auto text-base text-slate-300 leading-relaxed">${contenido}</p>
                </section>
            `;

        case 'tarjeta_servicio':
            return `
                <div class="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-primary/50 transition-all flex flex-col gap-4">
                    <span class="material-symbols-outlined text-primary text-3xl">star_rate</span>
                    <h3 class="text-2xl font-display italic text-white">${titulo}</h3>
                    <p class="text-sm text-slate-400 leading-relaxed">${contenido}</p>
                </div>
            `;

        case 'paso':
            return `
                <div class="flex gap-6 items-start p-6 bg-white/5 rounded-2xl border border-white/10">
                    <div class="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0 text-primary font-bold">#</div>
                    <div>
                        <h4 class="text-xl font-bold text-white mb-2">${titulo}</h4>
                        <p class="text-sm text-slate-400">${contenido}</p>
                    </div>
                </div>
            `;

        default:
            return `
                <section class="py-8 px-6 bg-white/5 rounded-2xl border border-white/10">
                    <h2 class="text-2xl font-display text-white mb-4">${titulo}</h2>
                    <p class="text-slate-400 text-sm">${contenido}</p>
                </section>
            `;
    }
}

// Global initialization
window.addEventListener('load', initDynamicRenderer);
