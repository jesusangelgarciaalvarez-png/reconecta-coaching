/**
 * PORTALCOACH API - SAVE TENANT PROMOTION
 */

const PROJECT_ID = "reconecta-ed650";
const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send({ message: 'Only POST allowed' });

    const tenantId = req.headers['x-tenant-id'] || 'master';
    const { text } = req.body;

    // Month ID (e.g., 2026-03)
    const now = new Date();
    const monthId = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const docId = `${tenantId}_${monthId}`;

    console.log(`[PROMO] Saving promo for ${tenantId} at ${monthId}`);

    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/promotions/${docId}?key=${API_KEY}`;

    try {
        const firestoreResponse = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    text: { stringValue: text },
                    tenant_id: { stringValue: tenantId },
                    active: { booleanValue: true },
                    updatedAt: { timestampValue: new Date().toISOString() }
                }
            })
        });

        if (firestoreResponse.ok) {
            return res.status(200).json({ success: true });
        } else {
            return res.status(500).json({ error: "Firestore Failed" });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
