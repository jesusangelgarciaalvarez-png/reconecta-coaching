/**
 * PORTALCOACH.COM - MASTER INITIALIZATION (SaaS Level)
 */

const PROJECT_ID = "reconecta-ed650";
const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

async function updateTenantSchema(id, extraData) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenants/${id}?updateMask.fieldPaths=platformFeePercent&updateMask.fieldPaths=referredBy&key=${API_KEY}`;

    const body = {
        fields: {
            platformFeePercent: { doubleValue: extraData.fee || 10.0 },
            referredBy: { stringValue: extraData.ref || "direct" }
        }
    };

    try {
        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (res.ok) console.log(`✅ Tenant '${id}' updated with SaaS fields.`);
    } catch (e) { }
}

// Update existing for testing
await updateTenantSchema('test', { fee: 15.0, ref: 'colaborador_01' });
await updateTenantSchema('master', { fee: 0, ref: 'founder' });

console.log("Master schema update complete.");
