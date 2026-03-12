/**
 * PORTALCOACH.COM - TENANT RESOLVER
 * Identifies the tenant (Coach/Agency) from the subdomain.
 */

export function getTenantId() {
    const host = window.location.hostname;

    // 0. Parameter Override (For Preview Mode)
    const urlParams = new URLSearchParams(window.location.search);
    const tenantOverride = urlParams.get('tenant');
    if (tenantOverride) {
        const tid = tenantOverride.toLowerCase();
        localStorage.setItem('pc_current_tenant', tid);
        return tid;
    }

    // 0.1 Force Master for Dashboard
    if (window.location.pathname.includes('/master-dashboard')) {
        return 'master';
    }

    // 0.2 Session Persistence (For navigation on same domain)
    const savedTenant = localStorage.getItem('pc_current_tenant');
    if (savedTenant) {
        return savedTenant;
    }

    // 1. Development / Localhost
    if (host === 'localhost' || host === '127.0.0.1' || host.includes('.local')) {
        return 'master';
    }

    // 2. Clean 'www' if present (anywhere at the start)
    let cleanHost = host.toLowerCase().replace(/^www\./, '');

    // 3. Split parts
    const parts = cleanHost.split('.');

    // 4. Root domain case (master)
    if (parts.length <= 2 && !host.endsWith('.vercel.app')) {
        return 'master';
    }

    // 5. Tenant identification (first part of subdomain)
    // Example: coach-maria.portalcoach.com -> coach-maria
    // We filter out common base domains to find the true tenant
    const baseDomains = ['portalcoach', 'vercel', 'app'];
    const tenant = parts.find(p => !baseDomains.includes(p) && p !== 'www');
    
    if (!tenant) return 'master';
    return tenant.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export const tenantId = getTenantId();
console.log(`[SUBSYSTEM] Coaching Personal Tenant: ${tenantId}`);
