/**
 * RECONECTA VISITOR TRACKER
 */

const RECONECTA_VISITOR_KEY = 'reconecta_visitor_id';
const RECONECTA_NAME_KEY = 'reconecta_visitor_name';

function getVisitorId() {
    let id = localStorage.getItem(RECONECTA_VISITOR_KEY);
    if (!id) {
        id = 'vis_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(RECONECTA_VISITOR_KEY, id);
    }
    return id;
}

export async function trackVisit() {
    // Don't track admin pages to avoid skewing stats
    if (window.location.pathname.includes('/admin')) return;

    // Resolve tenant from URL parameter or subdomain
    let tenantId = 'master';
    const params = new URLSearchParams(window.location.search);
    if (params.has('tenant')) {
        tenantId = params.get('tenant');
    } else {
        const host = window.location.hostname;
        if (host.includes('.portalcoach.com')) {
            tenantId = host.split('.')[0];
        }
    }

    const visitorId = getVisitorId();
    const name = localStorage.getItem(RECONECTA_NAME_KEY) || null;
    const path = window.location.pathname;

    try {
        await fetch('/api/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                visitorId,
                path,
                name,
                tenantId
            })
        });
    } catch (e) {
        console.warn('Tracker failed silently', e);
    }
}

// Automatically track on load
if (typeof window !== 'undefined') {
    trackVisit();
}
