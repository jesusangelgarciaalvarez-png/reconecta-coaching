/**
 * PORTALCOACH - DYNAMIC BRANDING ENGINE
 * Fetches tenant metadata and applies branding/themes to the UI.
 */
import { tenantId } from "./tenant-resolver.js";
import { getTenantMetadata } from "./firebase_v13.js";

const THEMES = {
    'nature': {
        bg: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=2560',
        primary: '#10b981', // Emerald
        accent: '#064e3b',
        gradientTop: '#1a3a3c',
        gradientBottom: '#0a1f1f'
    },
    'premium': {
        bg: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&q=80&w=2560',
        primary: '#fbbf24', // Amber/Gold
        accent: '#000000',
        gradientTop: '#1a1a1a',
        gradientBottom: '#000000'
    },
    'sunset': {
        bg: 'https://images.unsplash.com/photo-1475113548554-5a36f1f523d6?auto=format&fit=crop&q=80&w=2560',
        primary: '#fb7185', // Rose
        accent: '#4c0519',
        gradientTop: '#4c0519',
        gradientBottom: '#1a0208'
    },
    'cosmic': {
        bg: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&q=80&w=2560',
        primary: '#a855f7', // Purple
        accent: '#1e1b4b',
        gradientTop: '#1e1b4b',
        gradientBottom: '#020617'
    },
    'zen': {
        bg: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=2560',
        primary: '#6b7280', // Gray
        accent: '#f9fafb',
        gradientTop: '#374151',
        gradientBottom: '#111827'
    },
    'executive': {
        bg: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2560',
        primary: '#1e40af', // Blue
        accent: '#0f172a',
        gradientTop: '#1e3a8a',
        gradientBottom: '#030712'
    }
};

export async function initBranding() {
    console.log(`[SUBSYSTEM] Branding Initializing for Tenant: ${tenantId}`);
    // Debug: Inject tenantId into the version banner for verification
    const banner = document.getElementById('rebuild-banner') || document.querySelector('div[style*="position: fixed; top: 0"]');
    if (banner) {
        banner.textContent += ` | TID: ${tenantId}`;
    }
    await applyBranding();
    // Re-verify after a short delay to catch any late-loading dynamic injected elements
    setTimeout(applyBranding, 1500);
}

async function applyBranding() {
    console.log(`[BRANDING] Applying identity for: ${tenantId}`);
    const metadata = await getTenantMetadata();

    // Default Values for non-customized portals
    const defaults = {
        name: "Tu Coach de Bienestar",
        tagline: "Transforma tu interior, lidera tu vida.",
        heroTitle: "Encuentra tu centro,\nconecta contigo.",
        heroSubtitle: "Acompañamiento personalizado para tu bienestar integral.",
        coachGreeting: "Hola, soy tu coach",
        coachBio: "Acompañamiento enfocado en tu crecimiento y liderazgo interior.",
        coachMission: "Mi compromiso es ayudarte a encontrar claridad y paz emocional.",
        location: "Ciudad de México",
        phone: "(55) 0000 0000",
        email: "hola@portalcoach.com",
        videoPlaceholder: "/assets/generic-coaching.jpg",
        coachPhotoPlaceholder: "/assets/generic-avatar.png",
        feature1Title: "Resiliencia",
        feature1Desc: "Herramientas prácticas para navegar los desafíos diarios con fortaleza interna y calma.",
        feature2Title: "Claridad Mental",
        feature2Desc: "Libera el ruido mental y encuentra el enfoque necesario para tomar las mejores decisiones.",
        feature3Title: "Atención Plena",
        feature3Desc: "Prácticas de meditación y presencia para reducir el ruido mental y conectar con el presente."
    };

    if (!metadata) return;

    // 1. Apply Theme / Colors from Tenant Metadata
    const themeKey = metadata.theme || 'nature';
    const theme = THEMES[themeKey] || THEMES.nature;
    const primary = metadata.accentColor || theme.primary;

    document.documentElement.style.setProperty('--primary-color', primary);
    document.documentElement.style.setProperty('--bg-color-top', theme.gradientTop);
    document.documentElement.style.setProperty('--bg-color-bottom', theme.gradientBottom);

    // 1.1 Contrast Protection (Dynamic Overlays)
    applyContrastProtection(primary);

    // 1.1 Fetch Site Config for Typography (Website Builder)
    try {
        const hostParts = window.location.hostname.split('.');
        if (hostParts.length > 2 && !hostParts[0].includes('portalcoach') && hostParts[0] !== 'localhost') {
            const subdomain = hostParts[0];
            const siteRes = await fetch(`/api/sitios?subdominio=${subdomain}`);
            if (siteRes.ok) {
                const siteConfig = await siteRes.json();

                // Typography
                if (siteConfig.configuracion_visual?.tipografia) {
                    const font = siteConfig.configuracion_visual.tipografia;
                    document.body.style.fontFamily = `'${font}', sans-serif`;

                    // Preload if necessary (Editorial/Luxury fonts)
                    if (['Newsreader', 'Playfair Display'].includes(font)) {
                        const link = document.createElement('link');
                        link.href = `https://fonts.googleapis.com/css2?family=${font.replace(' ', '+')}:ital,wght@0,400;0,700;1,400&display=swap`;
                        link.rel = 'stylesheet';
                        document.head.appendChild(link);
                    }
                }

                // Dynamic Features from Site Config
                const pieSecs = siteConfig.paginas?.pie_pagina?.secciones || [];
                const inicioSecs = siteConfig.paginas?.inicio?.secciones || [];

                // 1. Hero Inicio
                const heroHome = inicioSecs.find(s => s.tipo === 'hero_home');
                if (heroHome) {
                    const heroTitleEl = document.getElementById('hero-title');
                    const heroSubEl = document.getElementById('hero-subtitle');
                    const heroTaglineEl = document.getElementById('hero-tagline');
                    if (heroTitleEl) heroTitleEl.innerHTML = heroHome.titulo.replace(/\n/g, '<br>');
                    if (heroSubEl) heroSubEl.textContent = heroHome.contenido;
                    if (heroTaglineEl && heroHome.tagline) heroTaglineEl.textContent = heroHome.tagline;
                }

                // 2. Características (Pie de Página - Dinámico)
                const gridEl = document.getElementById('features-grid');
                if (gridEl) {
                    gridEl.innerHTML = ''; // Clear loading

                    // Adjust grid columns based on count - Mobile-first approach
                    const count = pieSecs.length;
                    gridEl.className = `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count > 4 ? 4 : count} gap-3 md:gap-4 transition-all duration-700`;

                    // MASSIVE POOL (Hand-picked premium UNIQUE IDs)
                    const massivePool = [
                        'photo-1506126613408-eca07ce68773', 'photo-1441974231531-c6227db76b6e', 'photo-1470813740244-df37b8c1edcb',
                        'photo-1544367567-0f2fcb009e0b', 'photo-1508672019048-805c876b67e2', 'photo-1444703686981-a3abbc4d4fe3',
                        'photo-1552508744-1696d446496b', 'photo-1533038590840-1cde6e668a91', 'photo-1490730141103-6cac27aaab94',
                        'photo-1517836357463-d25dfeac3438', 'photo-1511497584788-8767fe7d98b1', 'photo-1501854140801-50d01698950b',
                        'photo-1499750310107-5fef28a66643', 'photo-1456324504439-367921cd3d44', 'photo-1501503060808-b5ed15eaf4ad',
                        'photo-1484480974693-6ca0a78fb36b', 'photo-1550684848-fac1c5b4e853', 'photo-1557683316-973673baf926',
                        'photo-1557682224-5b8590cd9ec5', 'photo-1504333638930-c8787321eba0', 'photo-1518063319789-7215e6946c1c',
                        'photo-1504386106331-3e4e9bc3360b', 'photo-1510784722466-f2aa9c52fed6', 'photo-1439853949127-fa647821eba0',
                        'photo-1470770841072-f978cf4d019e', 'photo-1464822759023-fed622ff2c3b', 'photo-1465146344425-f00d5f5c8f07',
                        'photo-1446776811953-b23d57bd21aa', 'photo-1444464666168-49d633b867ad', 'photo-1414235077428-338989a2e8c0'
                    ];

                    const shuffle = (array) => {
                        let m = array.length, t, i;
                        while (m) {
                            i = Math.floor(Math.random() * m--);
                            t = array[m];
                            array[m] = array[i];
                            array[i] = t;
                        }
                        return array;
                    };
                    const shuffledDeck = shuffle([...massivePool]);

                    pieSecs.forEach((feat, idx) => {
                        const defaultId = massivePool[idx % massivePool.length];
                        const fallbackId = massivePool[(idx + 10) % massivePool.length];

                        // --- EMERALD & NUCLEAR SHIELD (v53.0) ---
                        const STABLE_YOSEMITE = 'photo-1506744038136-46273834b3fb';

                        // Priority: 1. Manual selection (Unsplash ID) | 2. Default pool
                        let imgId = feat.image_keyword && feat.image_keyword.startsWith('photo-') 
                                    ? feat.image_keyword 
                                    : defaultId;

                        // NUCLEAR SHIELD: If imgId is still not a valid Unsplash ID (e.g. raw keywords like 'resilience')
                        // OR if it's the specific broken ID, force the Yosemite fallback.
                        const BROKEN_IDs = ['photo-1447752875215-b2761acb3c5d', 'photo-1500624238317-5e99ca296a5c'];
                        
                        if (!imgId.startsWith('photo-') || BROKEN_IDs.includes(imgId)) {
                            console.log("[NUCLEAR SHIELD] Intercepted invalid or broken image ID:", imgId);
                            imgId = STABLE_YOSEMITE;
                        }

                        const finalImgUrl = feat.image_url || `https://images.unsplash.com/${imgId}?auto=format&fit=crop&q=80&w=800`;

                        const cardHtml = `
                            <div class="glass-panel p-4 md:p-5 rounded-[1.5rem] group hover:bg-white/5 transition-all animate-fade-in" style="animation-delay: ${idx * 0.1}s">
                                <div class="aspect-video rounded-xl overflow-hidden mb-4 bg-white/5 shadow-inner">
                                    <img src="${finalImgUrl}"
                                        onerror="this.src='https://images.unsplash.com/${fallbackId}?auto=format&fit=crop&q=80&w=800'; this.onerror=null;"
                                        class="w-full h-full object-cover group-hover:scale-110 grayscale group-hover:grayscale-0 transition-all duration-700 brightness-[1.1] contrast-[1.05]"
                                        alt="${feat.titulo || 'Feature'}">
                                </div>
                                <h3 class="font-display text-base md:text-lg text-white mb-2 italic">${feat.titulo || ''}</h3>
                                <p class="text-slate-400 text-xs md:text-sm leading-tight line-clamp-3">${feat.contenido || ''}</p>
                            </div>
                        `;
                        gridEl.insertAdjacentHTML('beforeend', cardHtml);
                    });
                }
            }
        }
    } catch (e) {
        console.log("Using default typography");
    }

    // Update Backgrounds
    const heroBgs = document.querySelectorAll('.hero-zoom-crop, .faded-bg, .hero-bg-neutral');
    heroBgs.forEach(bg => {
        const bgUrl = metadata.customBg || theme.bg;
        if (bg.tagName === 'IMG') {
            bg.src = bgUrl;
            bg.style.opacity = '0.4';
        } else {
            bg.style.backgroundImage = `url('${bgUrl}')`;
            bg.style.backgroundSize = 'cover';
            bg.style.backgroundPosition = 'center';
            bg.style.opacity = '1';
        }
    });

    // Body transition - Apply to all pages consistently
    document.body.style.backgroundColor = theme.gradientBottom;
    document.body.style.backgroundImage = `radial-gradient(circle at top right, ${theme.gradientTop}, ${theme.gradientBottom})`;
    document.body.style.minHeight = '100vh';
    document.body.style.backgroundAttachment = 'fixed';

    // 2. Toggle Overrides - Null safe
    const servicesGrid = document.getElementById('services-grid');
    const servicesContent = document.getElementById('coach-services-content');
    if (metadata.coachServices) {
        if (servicesGrid) servicesGrid.classList.add('hidden');
        if (servicesContent) {
            servicesContent.classList.remove('hidden');
            servicesContent.textContent = metadata.coachServices;
        }
    }

    const methodGrid = document.getElementById('method-steps');
    const methodContent = document.getElementById('coach-method-content');
    if (metadata.coachMethod) {
        if (methodGrid) methodGrid.classList.add('hidden');
        if (methodContent) {
            methodContent.classList.remove('hidden');
            methodContent.textContent = metadata.coachMethod;
        }
    }

    // 3. Apply Professional Text Content
    const textMappings = {
        '#brand-name': metadata.name || defaults.name,
        '#menu-name': metadata.name || defaults.name,
        '#brand-tagline': metadata.tagline || defaults.tagline,
        '#menu-tagline': metadata.tagline || defaults.tagline,
        '#hero-subtitle': metadata.heroSubtitle || defaults.heroSubtitle,
        '#coach-greeting': metadata.coachGreeting || (metadata.name ? `Soy ${metadata.name}` : defaults.coachGreeting),
        '#coach-bio': metadata.coachBio || defaults.coachBio,
        '#coach-mission': metadata.coachMission || defaults.coachMission,
        '#contact-location': metadata.location || defaults.location,
        '#contact-phone': metadata.phone || defaults.phone,
        '#contact-whatsapp': metadata.whatsapp || metadata.phone || defaults.phone,
        '#contact-email': metadata.email || defaults.email,
        '#brand-location': metadata.location || defaults.location,
        '#brand-phone': metadata.phone || defaults.phone,
        '#brand-email': metadata.email || defaults.email,
        '#feature-1-title': metadata.feature1Title || defaults.feature1Title,
        '#feature-1-desc': metadata.feature1Desc || defaults.feature1Desc,
        '#feature-2-title': metadata.feature2Title || defaults.feature2Title,
        '#feature-2-desc': metadata.feature2Desc || defaults.feature2Desc,
        '#feature-3-title': metadata.feature3Title || defaults.feature3Title,
        '#feature-3-desc': metadata.feature3Desc || defaults.feature3Desc,
        '#feature-4-title': metadata.feature4Title || (defaults.feature4Title || "Autoestima"),
        '#feature-4-desc': metadata.feature4Desc || (defaults.feature4Desc || "Tu valor personal.")
    };

    Object.entries(textMappings).forEach(([selector, value]) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (value) {
                if (el.tagName === 'A' && selector.includes('email')) {
                    el.href = `mailto:${value}`;
                }
                el.textContent = value;
            }
        });
    });

    // Special case for Hero Title with line breaks
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) {
        const titleText = metadata.heroTitle || defaults.heroTitle;
        heroTitle.innerHTML = titleText.replace(/\n/g, '<br>');
    }

    // 4. Photos & Logos
    const photoElements = document.querySelectorAll('#coach-photo, #home-coach-photo, #checkout-coach-photo, #brand-logo, #menu-logo');
    photoElements.forEach(img => {
        const id = img.id;
        const metadataPhoto = metadata.coachPhoto || metadata.photoUrl || metadata.foto_perfil; // Support multiple naming conventions
        
        if (id === 'coach-photo' || id === 'home-coach-photo' || id === 'checkout-coach-photo') {
            img.src = metadataPhoto || defaults.coachPhotoPlaceholder;
            img.classList.remove('opacity-0'); // Ensure it's visible
        } else if (id === 'brand-logo' || id === 'menu-logo') {
            img.src = metadata.logoUrl || metadata.logo || "/assets/logo.jpg";
        }
    });

    // Special mobile-only background reset to ensure sync
    if (window.innerWidth < 768) {
        document.body.style.backgroundAttachment = 'scroll'; // Better for mobile performance and sync
    }

    // Video vs Image Fallback
    const videoContainer = document.querySelector('#coach-video-container');
    if (videoContainer) {
        const videoUrl = (metadata.videoUrl && typeof metadata.videoUrl === 'string') ? metadata.videoUrl.trim() : "";

        if (videoUrl !== "") {
            const isYoutube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
            let embedUrl = videoUrl;

            if (isYoutube) {
                const vidId = videoUrl.split('v=')[1]?.split('&')[0] || videoUrl.split('/').pop();
                embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=1&loop=1&playlist=${vidId}`;
            }

            videoContainer.innerHTML = `
                <iframe src="${embedUrl}" 
                    class="w-full h-full object-cover rounded-3xl" 
                    frameborder="0" allow="autoplay; fullscreen" allowfullscreen>
                </iframe>`;
        } else {
            videoContainer.innerHTML = `
                <img src="${metadata.coachPhoto || defaults.videoPlaceholder}" 
                    class="w-full h-full object-cover rounded-3xl shadow-2xl">`;
        }
    }

    // Dynamic Browser Title
    if (metadata.name) {
        document.title = `${document.title.split('|')[0]} | ${metadata.name}`;
    }
}

function applyContrastProtection(primary) {
    // Add internal style for better text legibility on dynamic backgrounds
    const styleId = 'contrast-protection-style';
    let style = document.getElementById(styleId);
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
    }

    style.textContent = `
        #hero-title { 
            text-shadow: 0 4px 60px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4); 
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        }
        #hero-subtitle { 
            text-shadow: 0 2px 10px rgba(0,0,0,0.8);
            background: rgba(0,0,0,0.15);
            backdrop-filter: blur(8px);
            padding: 6px 16px;
            border-radius: 12px;
            display: inline-block;
            border: 1px border-white/5;
        }
        #brand-name {
            text-shadow: 0 2px 15px rgba(0,0,0,0.6);
        }
        .hero-zoom-crop {
            filter: brightness(0.7) contrast(1.1);
        }
        /* Dynamic Header Protection */
        header {
            background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%);
        }
    `;
}

// Global accessibility
window.applyBranding = applyBranding;

document.addEventListener('DOMContentLoaded', applyBranding);
applyBranding(); // Early execution
