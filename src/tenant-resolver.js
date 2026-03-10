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
        return tenantOverride.toLowerCase();
    }

    // 1. Development / Localhost
    if (host === 'localhost' || host === '127.0.0.1' || host.includes('.local')) {
        return 'master';
    }

    // 2. Clean 'www' if present
    let cleanHost = host.replace(/^www\./i, '');

    // 3. Split parts
    const parts = cleanHost.split('.');

    // 4. Root domain or Vercel base domain case
    if (parts.length <= 2 || host.endsWith('.vercel.app')) {
        return 'master';
    }

    // 5. Tenant identification (first part of subdomain)
    // Example: coach-maria.portalcoach.com -> coach-maria
    const tenant = parts[0].toLowerCase();
    return tenant.replace(/[^a-z0-9-]/g, '');
}

export const tenantId = getTenantId();
console.log(`[SUBSYSTEM] Coaching Personal Tenant: ${tenantId}`);
