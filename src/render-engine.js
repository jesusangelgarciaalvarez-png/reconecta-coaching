/**
 * PORTALCOACH PUBLIC RENDER ENGINE
 * Detects subdomain, fetches configuration, and renders the site dynamycally.
 */

async function initRenderEngine() {
    const mainContainer = document.getElementById('contenedor-secciones');
    if (!mainContainer) return;

    // 1. Resolve Subdomain
    const hostname = window.location.hostname;
    // Local: pedro.localhost -> pedro | Prod: pedro.portalcoach.com -> pedro
    const parts = hostname.split('.');
    let subdomain = parts[0];

    // Skip if it's the main domain (assuming portalcoach.com)
    if (subdomain === 'www' || subdomain === 'portalcoach' || subdomain === 'localhost') {
        console.log("Main domain detected, skip render engine");
        return;
    }

    console.log(`[RENDER] Building site for subdomain: ${subdomain}`);

    try {
        // 2. Fetch Configuration
        const res = await fetch(`/api/sitios?subdominio=${subdomain}`);
        if (!res.ok) throw new Error("Sitio no encontrado");

        const config = await res.json();
        applyVisualConfig(config.configuracion_visual);
        renderSite(config.paginas, mainContainer);

    } catch (err) {
        mainContainer.innerHTML = `<div class="p-20 text-center"><h1 class="text-4xl font-display">404 - Sitio no encontrado</h1><p class="mt-4 opacity-50">El subdominio '${subdomain}' no está registrado.</p></div>`;
    }
}

function applyVisualConfig(config) {
    if (!config) return;
    document.documentElement.style.setProperty('--primary-color', config.color_primario || '#fbbf24');
    document.body.style.fontFamily = `'${config.tipografia}', sans-serif`;

    // Add font dynamic link if needed
    if (config.tipografia === 'Newsreader') {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,700;1,400&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
}

function renderSite(paginas, container) {
    container.innerHTML = '';

    // Render all sections from all pages in logical order
    ['mision', 'servicios', 'metodo'].forEach(pageKey => {
        const page = paginas[pageKey];
        if (page && page.secciones) {
            page.secciones.forEach(section => {
                const html = renderComponent(section);
                container.insertAdjacentHTML('beforeend', html);
            });
        }
    });
}

function renderComponent(section) {
    const { tipo, titulo, contenido } = section;

    switch (tipo) {
        case 'hero':
            return `
                <section class="py-24 px-6 text-center bg-dark/50 border-b border-white/5">
                    <h1 class="text-5xl md:text-7xl font-display italic text-white mb-6 animate-fade-in">${titulo}</h1>
                    <p class="max-w-2xl mx-auto text-lg text-slate-300 leading-relaxed">${contenido}</p>
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

        case 'caracteristica_home':
            const pool = ['photo-1506126613408-eca07ce68773', 'photo-1441974231531-c6227db76b6e', 'photo-1470813740244-df37b8c1edcb', 'photo-1544367567-0f2fcb009e0b', 'photo-1508672019048-805c876b67e2', 'photo-1528319725582-ddc0b6a22ff7'];
            const imgId = pool[Math.floor(Math.random() * pool.length)];
            return `
                <div class="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-primary/50 transition-all flex flex-col gap-4">
                    <div class="aspect-video rounded-xl overflow-hidden mb-4">
                        <img src="https://images.unsplash.com/${imgId}?auto=format&fit=crop&q=80&w=800" class="w-full h-full object-cover">
                    </div>
                    <h3 class="text-2xl font-display italic text-white">${titulo}</h3>
                    <p class="text-sm text-slate-400 leading-relaxed">${contenido}</p>
                </div>
            `;

        default:
            return `
                <section class="py-12 px-6">
                    <h2 class="text-3xl font-display text-white mb-4">${titulo}</h2>
                    <p class="text-slate-400">${contenido}</p>
                </section>
            `;
    }
}

// Auto-init on page load
window.addEventListener('load', initRenderEngine);
