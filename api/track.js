/**
 * RECONECTA TRACKER v1.0
 * Logs page visits to Firestore
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const data = req.body;
    const PROJECT_ID = "reconecta-ed650";
    const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

    if (!data.visitorId || !data.path) {
        return res.status(400).json({ error: "Missing data" });
    }

    try {
        const timestamp = Date.now();
        const dateObj = new Date(timestamp);
        const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
        const monthStr = dateStr.substring(0, 7); // YYYY-MM

        const visitId = `${timestamp}-${Math.floor(Math.random() * 1000)}`;

        // 1. Log Visit
        const visitUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/visits?key=${API_KEY}`;
        const visitBody = {
            fields: {
                visitorId: { stringValue: String(data.visitorId) },
                tenantId: { stringValue: String(data.tenantId || 'master') },
                path: { stringValue: String(data.path) },
                timestamp: { integerValue: String(timestamp) },
                date: { stringValue: dateStr },
                month: { stringValue: monthStr },
                name: { stringValue: data.name || "Anónimo" }
            }
        };

        await fetch(visitUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(visitBody)
        });

        // 2. Update Global Counter (Optional but helpful for fast dashboard)
        // For simplicity, we'll just query visits for the charts

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error("TRACK_CRASH:", error);
        return res.status(500).json({ error: "TRACK_CRASH", details: error.message });
    }
}
