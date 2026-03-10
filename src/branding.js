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
        accent: '#064e3b'
    },
    'premium': {
        bg: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&q=80&w=2560',
        primary: '#fbbf24', // Amber/Gold
        accent: '#000000'
    },
    'sunset': {
        bg: 'https://images.unsplash.com/photo-1475113548554-5a36f1f523d6?auto=format&fit=crop&q=80&w=2560',
        primary: '#fb7185', // Rose
        accent: '#4c0519'
    },
    'cosmic': {
        bg: 'https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&q=80&w=2560',
        primary: '#a855f7', // Purple
        accent: '#1e1b4b'
    },
    'zen': {
        bg: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=2560',
        primary: '#6b7280', // Gray
        accent: '#f9fafb'
    },
    'executive': {
        bg: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2560',
        primary: '#1e40af', // Blue
        accent: '#0f172a'
    }
};

export async function initBranding() {
    await applyBranding();
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
        coachPhotoPlaceholder: "/assets/generic-avatar.png"
    };

    if (!metadata) return;

    // 1. Apply Theme / Colors
    const themeKey = metadata.theme || 'nature';
    const theme = THEMES[themeKey] || THEMES.nature;
    document.documentElement.style.setProperty('--primary-color', metadata.accentColor || theme.primary);

    // Update Backgrounds
    const heroBgs = document.querySelectorAll('.hero-zoom-crop, .faded-bg');
    heroBgs.forEach(bg => {
        const bgUrl = metadata.customBg || theme.bg;
        if (bg.tagName === 'IMG') {
            bg.src = bgUrl;
        } else {
            bg.style.backgroundImage = `url('${bgUrl}')`;
        }
    });

    // 2. Toggle Overrides
    if (metadata.coachServices) {
        const grid = document.getElementById('services-grid');
        const content = document.getElementById('coach-services-content');
        if (grid) grid.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    }

    if (metadata.coachMethod) {
        const grid = document.getElementById('method-steps');
        const content = document.getElementById('coach-method-content');
        if (grid) grid.classList.add('hidden');
        if (content) content.classList.remove('hidden');
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
        '#coach-services-content': metadata.coachServices,
        '#coach-method-content': metadata.coachMethod,
        '#contact-location': metadata.location || defaults.location,
        '#contact-phone': metadata.phone || defaults.phone,
        '#contact-whatsapp': metadata.whatsapp || metadata.phone || defaults.phone,
        '#contact-email': metadata.email || defaults.email,
        '#brand-location': metadata.location || defaults.location,
        '#brand-phone': metadata.phone || defaults.phone,
        '#brand-email': metadata.email || defaults.email
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

    // 4. Photos & Videos
    const photoElements = document.querySelectorAll('#coach-photo, #checkout-coach-photo, #brand-logo, #menu-logo');
    photoElements.forEach(img => {
        const id = img.id;
        if (id === 'coach-photo' || id === 'checkout-coach-photo') {
            img.src = metadata.coachPhoto || defaults.coachPhotoPlaceholder;
        } else if (id === 'brand-logo' || id === 'menu-logo') {
            img.src = metadata.logoUrl || "/assets/logo.jpg";
        }
    });

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

// Global accessibility
window.applyBranding = applyBranding;

document.addEventListener('DOMContentLoaded', applyBranding);
applyBranding(); // Early execution
