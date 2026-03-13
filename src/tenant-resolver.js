/**
 * PORTALCOACH.COM - TENANT RESOLVER
 * Identifies the tenant (Coach/Agency) from the subdomain.
 */

export function getTenantId() {
    const host = window.location.hostname.toLowerCase();

    // 0. Parameter Override (For Preview Mode) - HIGHEST PRIORITY
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

    // 1. Resolve from Hostname (TRUTH SOURCE)
    let cleanHost = host.replace(/^www\./, '');
    const parts = cleanHost.split('.');

    // 1.1 Support for custom domains or vercel deployments
    const baseDomains = ['portalcoach', 'vercel', 'app'];
    const tenantFromHost = parts.find(p => !baseDomains.includes(p) && p !== 'www');

    // 2. Validate Session Persistence
    const savedTenant = localStorage.getItem('pc_current_tenant');

    if (tenantFromHost) {
        const resolved = tenantFromHost.toLowerCase().replace(/[^a-z0-9-]/g, '');
        // If resolved tenant from host differs from saved, host wins (prevents cross-tenant leak)
        if (resolved !== savedTenant) {
            localStorage.setItem('pc_current_tenant', resolved);
        }
        return resolved;
    }

    // 3. Fallbacks
    if (savedTenant) return savedTenant;
    if (host === 'localhost' || host === '127.0.0.1' || host.includes('.local')) return 'master';

    return 'master';
}

export const tenantId = getTenantId();
console.log(`[SUBSYSTEM] Coaching Personal Tenant: ${tenantId}`);
