/**
 * MEDIC/COACH PRO BRIDGE v40.0 - AGNOSTIC ARCHITECTURE
 * Handles both Coaching and Medical bookings with specialized price logic.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const data = req.body;
    const PROJECT_ID = "reconecta-ed650";
    const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

    // INDUSTRY MODE CONFIG
    const isDemo = data.isDemo === true;
    const isMedical = data.serviceType === 'MEDICAL';
    const COLL_APP = isDemo ? "demo_appointments" : "appointments";
    const COLL_DAYS = isDemo ? "demo_days" : "days";
    const COLL_USERS = isDemo ? "demo_users" : "users";
    const COLL_PROMOS = "promotions";

    try {
        console.log(`SYNC-BRIDGE: Processing ${isMedical ? 'MEDICAL' : 'COACHING'} booking for`, data.id);

        // 1. SAVE APPOINTMENT RECORD
        let promoValidation = "NONE";
        let basePrice = isMedical ? 1200 : 600;
        let promoText = "";

        // FETCH MONTHLY PROMO DATA (Only for Coaching normally)
        if (!isMedical) {
            try {
                const monthId = data.date.substring(0, 7);
                const promoUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLL_PROMOS}/${monthId}?key=${API_KEY}`;
                const promoRead = await fetch(promoUrl);
                if (promoRead.ok) {
                    const promoData = await promoRead.json();
                    if (promoData.fields && promoData.fields.price) {
                        basePrice = parseFloat(promoData.fields.price.stringValue || "600");
                    }
                    if (promoData.fields && promoData.fields.text) {
                        promoText = promoData.fields.text.stringValue.toLowerCase();
                    }
                }
            } catch (e) {
                console.warn("Could not fetch monthly promo");
            }
        }

        // 2. FETCH USER VISIT HISTORY
        const userUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLL_USERS}/${data.phone}?key=${API_KEY}`;
        let visitCount = 1;
        const userRead = await fetch(userUrl);
        if (userRead.ok) {
            const userData = await userRead.json();
            if (userData.fields && userData.fields.visitCount && userData.fields.visitCount.integerValue) {
                visitCount = parseInt(userData.fields.visitCount.integerValue) + 1;
            }
        }

        // 3. PRICE CALCULATION LOGIC
        let finalPrice = basePrice;
        let discountApplied = "ORIGINAL_PRICE";

        // A. Promo Text Logic (Coaching)
        if (!isMedical && promoText) {
            const isFirst = promoText.includes("primera") || promoText.includes("1era");
            const isSecond = promoText.includes("segunda") || promoText.includes("2da");
            const isThird = promoText.includes("tercera") || promoText.includes("3ra");

            let match = false;
            if (isFirst && visitCount === 1) match = true;
            if (isSecond && visitCount === 2) match = true;
            if (isThird && visitCount === 3) match = true;
            if (!isFirst && !isSecond && !isThird) match = true; // General promo

            if (match) {
                if (promoText.includes("gratis")) finalPrice = 0;
                else {
                    const pctMatch = promoText.match(/(\d+)\s*%/);
                    if (pctMatch) finalPrice = basePrice * (1 - (parseInt(pctMatch[1]) / 100));
                }
            }
        }

        // B. Friend Promo (Viral)
        if (data.friendPhone) {
            const checkUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLL_USERS}/${data.friendPhone}?key=${API_KEY}`;
            const checkRes = await fetch(checkUrl);
            if (checkRes.ok) {
                finalPrice = finalPrice * 0.8;
                discountApplied += "_FRIEND_REBATE";
                promoValidation = "FRIEND_VERIFIED";
            } else {
                promoValidation = "FRIEND_NOT_FOUND";
            }
        }

        // C. Insurance Logic (Medical)
        if (isMedical && data.insurance && data.insurance !== 'private') {
            finalPrice = basePrice * 0.4; // 60% coverage
            discountApplied = `INSURANCE_${data.insurance.toUpperCase()}_APPLIED`;
        }

        if (data.previewOnly) {
            return res.status(200).json({ success: true, finalPrice: finalPrice });
        }

        // 4. PERSIST TO FIRESTORE
        const appUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLL_APP}/${data.id}?key=${API_KEY}`;
        const appBody = {
            fields: {
                id: { stringValue: String(data.id) },
                name: { stringValue: String(data.name) },
                email: { stringValue: String(data.email) },
                phone: { stringValue: String(data.phone) },
                date: { stringValue: String(data.date) },
                time: { stringValue: String(data.time) },
                price: { stringValue: String(finalPrice) },
                discountStatus: { stringValue: discountApplied },
                serviceType: { stringValue: String(data.serviceType || "COACHING") },
                insurance: { stringValue: String(data.insurance || "NONE") },
                timestamp: { integerValue: String(Date.now()) },
                visitNumber: { integerValue: String(visitCount) },
                systemInfo: { stringValue: "v40.0-GENERIC-READY" }
            }
        };

        await fetch(appUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appBody)
        });

        // 5. UPDATE AVAILABILITY MAP
        const dayUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLL_DAYS}/${data.date}?key=${API_KEY}`;
        const blockTimes = [data.time];
        if (data.doubleSlot) {
            const [h, m] = data.time.split(':');
            blockTimes.push(`${(parseInt(h) + 1).toString().padStart(2, '0')}:${m}`);
        }

        let currentTimes = [];
        const dayRead = await fetch(dayUrl);
        if (dayRead.ok) {
            const dayData = await dayRead.json();
            if (dayData.fields?.times?.arrayValue?.values) {
                currentTimes = dayData.fields.times.arrayValue.values.map(v => v.stringValue);
            }
        }

        const bookingsUpdates = {};
        blockTimes.forEach(t => {
            if (!currentTimes.includes(t)) currentTimes.push(t);
            bookingsUpdates[`bookings.${t.replace(':', '_')}`] = { stringValue: data.id };
        });

        await fetch(dayUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    times: { arrayValue: { values: currentTimes.map(t => ({ stringValue: t })) } },
                    ...bookingsUpdates
                }
            })
        });

        // 6. UPDATE USER PROFILE
        const userUpdateUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLL_USERS}/${data.phone}?key=${API_KEY}`;
        await fetch(userUpdateUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    name: { stringValue: String(data.name) },
                    email: { stringValue: String(data.email) },
                    visitCount: { integerValue: String(visitCount) },
                    lastActive: { timestampValue: new Date().toISOString() }
                }
            })
        });

        return res.status(200).json({ success: true, finalPrice: finalPrice, visitCount: visitCount });

    } catch (err) {
        console.error("BRIDGE_CRASH:", err);
        return res.status(500).json({ error: "BRIDGE_CRASH", details: err.message });
    }
}
