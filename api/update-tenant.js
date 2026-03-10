/**
 * PORTALCOACH API - UPDATE TENANT METADATA
 */

const PROJECT_ID = "reconecta-ed650";
const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send({ message: 'Only POST allowed' });

    // 1. Resolve Tenant
    const tenantId = req.headers['x-tenant-id'] || 'master';
    const body = req.body;

    console.log(`[AUTH] Update request for tenant: ${tenantId}`);

    const fields = {};
    const fieldPaths = [];

    if (body.pin) {
        fields.pin = { stringValue: String(body.pin) };
        fieldPaths.push('pin');
    }

    if (body.price) {
        fields.price = { stringValue: String(body.price) };
        fieldPaths.push('price');
    }
    if (body.name) {
        fields.name = { stringValue: body.name };
        fieldPaths.push('name');
    }
    if (body.stripeEnabled !== undefined) {
        fields.stripeEnabled = { booleanValue: body.stripeEnabled };
        fieldPaths.push('stripeEnabled');
    }
    if (body.status) {
        fields.status = { stringValue: body.status };
        fieldPaths.push('status');
    }

    // Branding & Theme
    if (body.tagline !== undefined) {
        fields.tagline = { stringValue: body.tagline || "" };
        fieldPaths.push('tagline');
    }
    if (body.heroTitle) {
        fields.heroTitle = { stringValue: body.heroTitle };
        fieldPaths.push('heroTitle');
    }
    if (body.videoUrl !== undefined) {
        fields.videoUrl = { stringValue: body.videoUrl || "" };
        fieldPaths.push('videoUrl');
    }
    if (body.coachBio !== undefined) {
        fields.coachBio = { stringValue: body.coachBio || "" };
        fieldPaths.push('coachBio');
    }
    if (body.coachServices !== undefined) {
        fields.coachServices = { stringValue: body.coachServices || "" };
        fieldPaths.push('coachServices');
    }
    if (body.coachMethod !== undefined) {
        fields.coachMethod = { stringValue: body.coachMethod || "" };
        fieldPaths.push('coachMethod');
    }
    if (body.coachMission !== undefined) {
        fields.coachMission = { stringValue: body.coachMission || "" };
        fieldPaths.push('coachMission');
    }
    if (body.location) {
        fields.location = { stringValue: body.location };
        fieldPaths.push('location');
    }
    if (body.phone) {
        fields.phone = { stringValue: body.phone };
        fieldPaths.push('phone');
    }
    if (body.email) {
        fields.email = { stringValue: body.email };
        fieldPaths.push('email');
    }
    // New Address Fields
    if (body.street) {
        fields.street = { stringValue: body.street };
        fieldPaths.push('street');
    }
    if (body.colonia) {
        fields.colonia = { stringValue: body.colonia };
        fieldPaths.push('colonia');
    }
    if (body.state) {
        fields.state = { stringValue: body.state };
        fieldPaths.push('state');
    }
    if (body.zipCode) {
        fields.zipCode = { stringValue: body.zipCode };
        fieldPaths.push('zipCode');
    }
    if (body.theme) {
        fields.theme = { stringValue: body.theme };
        fieldPaths.push('theme');
    }
    if (body.accentColor) {
        fields.accentColor = { stringValue: body.accentColor };
        fieldPaths.push('accentColor');
    }
    if (body.logoUrl) {
        fields.logoUrl = { stringValue: body.logoUrl };
        fieldPaths.push('logoUrl');
    }
    if (body.coachPhoto) {
        fields.coachPhoto = { stringValue: body.coachPhoto };
        fieldPaths.push('coachPhoto');
    }

    // Tiered Fee Overrides
    if (body.fee_tier1 !== undefined) {
        fields.fee_tier1 = { doubleValue: body.fee_tier1 };
        fieldPaths.push('fee_tier1');
    }
    if (body.fee_tier2_min !== undefined) {
        fields.fee_tier2_min = { integerValue: String(body.fee_tier2_min) };
        fieldPaths.push('fee_tier2_min');
    }
    if (body.fee_tier2_rate !== undefined) {
        fields.fee_tier2_rate = { doubleValue: body.fee_tier2_rate };
        fieldPaths.push('fee_tier2_rate');
    }
    if (body.fee_tier3_min !== undefined) {
        fields.fee_tier3_min = { integerValue: String(body.fee_tier3_min) };
        fieldPaths.push('fee_tier3_min');
    }
    if (body.fee_tier3_rate !== undefined) {
        fields.fee_tier3_rate = { doubleValue: body.fee_tier3_rate };
        fieldPaths.push('fee_tier3_rate');
    }

    if (fieldPaths.length === 0) return res.status(400).json({ message: "No fields to update" });

    const maskParams = fieldPaths.map(p => `updateMask.fieldPaths=${p}`).join('&');
    const updateUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenants/${tenantId}?${maskParams}&key=${API_KEY}`;

    try {
        const firestoreRes = await fetch(updateUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
        });

        if (firestoreRes.ok) {
            return res.status(200).json({ success: true, message: "Tenant updated" });
        } else {
            const errorData = await firestoreRes.json();
            return res.status(500).json({ success: false, error: errorData });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
