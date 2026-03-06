/**
 * VERCEL BRIDGE v15.0 - SYNC ARCHITECTURE
 * Ensures BOTH the appointment AND the availability map are updated.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const data = req.body;
    const PROJECT_ID = "reconecta-ed650";
    const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

    try {
        console.log("SYNC-BRIDGE: Processing booking for", data.id, "at", data.date);

        // 1. SAVE APPOINTMENT RECORD
        const appUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/appointments/${data.id}?key=${API_KEY}`;
        const appBody = {
            fields: {
                id: { stringValue: String(data.id) },
                name: { stringValue: String(data.name) },
                email: { stringValue: String(data.email) },
                phone: { stringValue: String(data.phone) },
                date: { stringValue: String(data.date) },
                time: { stringValue: String(data.time) },
                meetLink: { stringValue: "https://meet.google.com/hbm-pivc-mvy" },
                timestamp: { integerValue: String(Date.now()) },
                systemInfo: { stringValue: "v15.0-SYNC" }
            }
        };

        const appResponse = await fetch(appUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appBody)
        });

        if (!appResponse.ok) {
            const err = await appResponse.text();
            return res.status(500).json({ error: "ERR_SAVE_APP", details: err });
        }

        // 2. UPDATE AVAILABILITY MAP (days/{date})
        // We use a read-then-write approach for simplicity in the bridge
        const dayUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/days/${data.date}?key=${API_KEY}`;

        let currentTimes = [];
        const dayRead = await fetch(dayUrl);
        if (dayRead.ok) {
            const dayData = await dayRead.json();
            if (dayData.fields && dayData.fields.times && dayData.fields.times.arrayValue) {
                currentTimes = dayData.fields.times.arrayValue.values?.map(v => v.stringValue) || [];
            }
        }

        // Add the new time if it's not already there
        if (!currentTimes.includes(data.time)) {
            currentTimes.push(data.time);
        }

        const dayBody = {
            fields: {
                times: {
                    arrayValue: {
                        values: currentTimes.map(t => ({ stringValue: t }))
                    }
                },
                [`bookings.${data.time.replace(':', '_')}`]: { stringValue: data.id }
            }
        };

        // Use PATCH to update the day document
        await fetch(dayUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dayBody)
        });

        return res.status(200).json({ success: true, message: "Appointment and Map updated" });

    } catch (error) {
        console.error("BRIDGE_CRASH:", error);
        return res.status(500).json({ error: "BRIDGE_CRASH", details: error.message });
    }
}
