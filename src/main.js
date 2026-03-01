import './index.css'

console.log('Bold Empowerment App Initialized');

// Simple routing or interactivity can be added here
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        // Prevent default for now as we build the flow
        if (link.getAttribute('href') === '#') e.preventDefault();
    });
});

// Navigation Menu Logic
document.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn');
    const closeBtn = document.getElementById('close-menu');
    const navMenu = document.getElementById('nav-menu');
    const menuLinks = document.querySelectorAll('.menu-link');

    const toggleMenu = () => {
        navMenu.classList.toggle('active');
        document.body.classList.toggle('overflow-hidden');
    };

    if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
    if (closeBtn) closeBtn.addEventListener('click', toggleMenu);

    menuLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            document.body.classList.remove('overflow-hidden');
        });
    });
});
