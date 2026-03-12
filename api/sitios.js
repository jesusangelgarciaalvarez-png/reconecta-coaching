/**
 * PORTALCOACH API - COACH SITE MANAGEMENT
 */

const PROJECT_ID = "reconecta-ed650";
const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

export default async function handler(req, res) {
    const { subdominio } = req.query;

    // Handle path parameters if not present in query (fallback for direct calls)
    const sub = subdominio || req.url.split('/').pop().split('?')[0];

    if (req.method === 'GET') {
        return handleGet(sub, res);
    } else if (req.method === 'PUT' || req.method === 'POST') {
        return handlePut(sub, req.body, res);
    } else {
        return res.status(405).json({ message: "Method not allowed" });
    }
}

async function handleGet(subdominio, res) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/sitios_coaches/${subdominio}?key=${API_KEY}`;

    try {
        const firestoreRes = await fetch(url);
        if (firestoreRes.ok) {
            const data = await firestoreRes.json();
            // Simplify Firestore structure for frontend
            const simplified = simplifyFirestore(data.fields);
            return res.status(200).json(simplified);
        } else {
            return res.status(404).json({ message: "Site not found" });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function handlePut(subdominio, data, res) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/sitios_coaches/${subdominio}?key=${API_KEY}`;

    // Convert to Firestore structure
    const fields = buildFirestoreFields(data);

    try {
        const firestoreRes = await fetch(url, {
            method: 'PATCH', // PATCH with document creation support
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
        });

        if (firestoreRes.ok) {
            return res.status(200).json({ success: true });
        } else {
            const err = await firestoreRes.json();
            return res.status(500).json({ error: "Firestore Save Failed", details: err });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

// Helper to convert JSON to Firestore Typed Fields
function buildFirestoreFields(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            fields[key] = { stringValue: value };
        } else if (typeof value === 'number') {
            fields[key] = { doubleValue: value };
        } else if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                fields[key] = {
                    arrayValue: {
                        values: value.map(item => ({
                            mapValue: { fields: buildFirestoreFields(item) }
                        }))
                    }
                };
            } else {
                fields[key] = {
                    mapValue: { fields: buildFirestoreFields(value) }
                };
            }
        }
    }
    return fields;
}

// Helper to simplify Firestore Typed Fields back to JSON
function simplifyFirestore(fields) {
    const obj = {};
    for (const [key, value] of Object.entries(fields || {})) {
        if (value.stringValue !== undefined) obj[key] = value.stringValue;
        else if (value.doubleValue !== undefined) obj[key] = value.doubleValue;
        else if (value.integerValue !== undefined) obj[key] = parseInt(value.integerValue);
        else if (value.mapValue !== undefined) obj[key] = simplifyFirestore(value.mapValue.fields);
        else if (value.arrayValue !== undefined) {
            const vals = value.arrayValue.values || [];
            obj[key] = vals.map(v => simplifyFirestore(v.mapValue ? v.mapValue.fields : {}));
        }
    }
    return obj;
}
