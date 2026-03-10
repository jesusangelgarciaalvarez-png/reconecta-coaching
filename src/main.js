import './index.css'
import './tracker.js'
import { initBranding } from './branding.js'

console.log('Bold Empowerment App Initialized (SaaS Mode)');

// 0. Auto-redirect Master Subdomain to Dashboard
if (window.location.hostname.toLowerCase().includes('master.') &&
    (window.location.pathname === '/' || window.location.pathname === '/index.html')) {
    window.location.href = '/master-dashboard';
}
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize SaaS Branding
    await initBranding();

    const menuBtn = document.getElementById('menu-btn');
    const closeBtn = document.getElementById('close-menu');
    const navMenu = document.getElementById('nav-menu');
    const menuLinks = document.querySelectorAll('.menu-link');

    const toggleMenu = () => {
        if (navMenu) {
            navMenu.classList.toggle('active');
            document.body.classList.toggle('overflow-hidden');
        }
    };

    if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
    if (closeBtn) closeBtn.addEventListener('click', toggleMenu);

    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) {
                navMenu.classList.remove('active');
                document.body.classList.remove('overflow-hidden');
            }
        });
    });
});
