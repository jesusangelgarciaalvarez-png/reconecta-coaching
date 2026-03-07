/**
 * VERCEL BRIDGE v16.0 - SYNC ARCHITECTURE + VISIT TRACKING
 * Ensures BOTH the appointment AND the availability map are updated, and tracks visit counts.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const data = req.body;
    const PROJECT_ID = "reconecta-ed650";
    const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

    try {
        console.log("SYNC-BRIDGE: Processing booking for", data.id, "at", data.date);

        // 1. SAVE APPOINTMENT RECORD
        let promoValidation = "NONE";
        let basePrice = 600; // Default Numeric
        let promoText = "";

        // FETCH MONTHLY PROMO DATA
        try {
            const monthId = data.date.substring(0, 7); // YYYY-MM
            const promoUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/promotions/${monthId}?key=${API_KEY}`;
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
            console.warn("Could not fetch monthly promo, using defaults");
        }

        // 2. FETCH USER VISIT HISTORY (FOR TARGETED PROMOS)
        const userUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${data.phone}?key=${API_KEY}`;
        let visitCount = 1;
        const userRead = await fetch(userUrl);
        if (userRead.ok) {
            const userData = await userRead.json();
            if (userData.fields && userData.fields.visitCount && userData.fields.visitCount.integerValue) {
                visitCount = parseInt(userData.fields.visitCount.integerValue) + 1;
            }
        }

        // 3. PROMOTION INTELLIGENCE ENGINE (CALCULATE FINAL PRICE)
        let finalPrice = basePrice;
        let discountApplied = "ORIGINAL_PRICE";

        if (promoText) {
            // Check for specific session promos
            const isFirstSessionPromo = promoText.includes("primera") || promoText.includes("1era");
            const isSecondSessionPromo = promoText.includes("segunda") || promoText.includes("2da");
            const isThirdSessionPromo = promoText.includes("tercera") || promoText.includes("3ra");

            let isTargetMatched = false;
            if (isFirstSessionPromo && visitCount === 1) isTargetMatched = true;
            if (isSecondSessionPromo && visitCount === 2) isTargetMatched = true;
            if (isThirdSessionPromo && visitCount === 3) isTargetMatched = true;

            // If it's a general promo (e.g., "Descuento del 10% en todas...")
            const isGeneralPromo = !isFirstSessionPromo && !isSecondSessionPromo && !isThirdSessionPromo;

            if (isTargetMatched || isGeneralPromo) {
                // Check if it's FREE
                if (promoText.includes("gratis") || promoText.includes("regalo")) {
                    finalPrice = 0;
                    discountApplied = "PROMO_FREE_SUCCESS";
                } else {
                    // Look for percentage discount (e.g., 25%)
                    const pctMatch = promoText.match(/(\d+)\s*%/);
                    if (pctMatch) {
                        const pct = parseInt(pctMatch[1]);
                        finalPrice = basePrice * (1 - (pct / 100));
                        discountApplied = `PROMO_${pct}PCT_OFF`;
                    }
                }
            }
        }

        // FRIEND PROMO VALIDATION (CHECK IF FRIEND EXISTS)
        if (data.friendPhone) {
            const checkUserUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${data.friendPhone}?key=${API_KEY}`;
            const checkRes = await fetch(checkUserUrl);
            promoValidation = checkRes.ok ? "FRIEND_VERIFIED" : "FRIEND_NOT_FOUND";
            // Apply 20% friend discount if verified
            if (checkRes.ok) {
                finalPrice = finalPrice * 0.8;
                discountApplied += "_FRIEND_REBATE";
            }
        }

        const appUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/appointments/${data.id}?key=${API_KEY}`;
        const appBody = {
            fields: {
                id: { stringValue: String(data.id) },
                name: { stringValue: String(data.name) },
                email: { stringValue: String(data.email) },
                phone: { stringValue: String(data.phone) },
                date: { stringValue: String(data.date) },
                time: { stringValue: String(data.time) },
                friendPhone: { stringValue: String(data.friendPhone || "") },
                promoValidation: { stringValue: promoValidation },
                price: { stringValue: String(finalPrice) },
                discountStatus: { stringValue: discountApplied },
                meetLink: { stringValue: "https://meet.google.com/hbm-pivc-mvy" },
                visitNumber: { integerValue: String(visitCount) },
                timestamp: { integerValue: String(Date.now()) },
                systemInfo: { stringValue: "v38.0-INTELIBRAIN" }
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

        // 4. UPDATE AVAILABILITY MAP (days/{date})
        const dayUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/days/${data.date}?key=${API_KEY}`;

        // Calculate block times (current + next hour if doubleSlot is active)
        const blockTimes = [data.time];
        if (data.doubleSlot) {
            const [h, m] = data.time.split(':');
            const nextH = (parseInt(h) + 1).toString().padStart(2, '0');
            blockTimes.push(`${nextH}:${m}`);
        }

        let currentTimes = [];
        const dayRead = await fetch(dayUrl);
        if (dayRead.ok) {
            const dayData = await dayRead.json();
            if (dayData.fields && dayData.fields.times && dayData.fields.times.arrayValue) {
                currentTimes = dayData.fields.times.arrayValue.values?.map(v => v.stringValue) || [];
            }
        }

        const bookingsUpdates = {};
        blockTimes.forEach(t => {
            if (!currentTimes.includes(t)) {
                currentTimes.push(t);
            }
            bookingsUpdates[`bookings.${t.replace(':', '_')}`] = { stringValue: data.id };
        });

        const dayBody = {
            fields: {
                times: {
                    arrayValue: {
                        values: currentTimes.map(t => ({ stringValue: t }))
                    }
                },
                ...bookingsUpdates
            }
        };

        await fetch(dayUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dayBody)
        });

        // 3. TRACK USER VISITS (users/{phone})
        const userUrlUpdate = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${data.phone}?key=${API_KEY}`;
        const userBody = {
            fields: {
                name: { stringValue: String(data.name) },
                email: { stringValue: String(data.email) },
                phone: { stringValue: String(data.phone) },
                visitCount: { integerValue: String(visitCount) },
                lastBookingId: { stringValue: String(data.id) },
                lastActive: { timestampValue: new Date().toISOString() }
            }
        };

        await fetch(userUrlUpdate, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userBody)
        });

        return res.status(200).json({
            success: true,
            message: "App, Map and Visit Count updated (InteliBrain Active)",
            visitCount: visitCount,
            finalPrice: finalPrice
        });

    } catch (error) {
        console.error("BRIDGE_CRASH:", error);
        return res.status(500).json({ error: "BRIDGE_CRASH", details: error.message });
    }
}
