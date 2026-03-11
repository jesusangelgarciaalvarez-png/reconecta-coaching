/**
 * PORTALCOACH.COM SaaS BRIDGE v51.0 - B2B MULTI-TENANT ARCHITECTURE
 * Handles Coaching/Medical bookings with strict data isolation.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const data = req.body;
    const PROJECT_ID = "reconecta-ed650";
    const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";

    // 0. MULTI-TENANT RESOLUTION
    let tid = req.headers['x-tenant-id'] || data.tenant_id;
    if (!tid) {
        const host = req.headers.host || "";
        const hostParts = host.split('.');
        tid = hostParts.length > 2 ? hostParts[0] : "master";
    }
    const tenantId = tid.toLowerCase();

    // INDUSTRY MODE CONFIG
    const isDemo = data.isDemo === true;
    const isMedical = data.serviceType === 'MEDICAL';
    const COLL_APP = isDemo ? "demo_appointments" : "appointments";
    const COLL_DAYS = isDemo ? "demo_days" : "days";
    const COLL_USERS = isDemo ? "demo_users" : "users";

    try {
        console.log(`[Coaching-SaaS] Processing ${tenantId} | ${data.id}`);

        // 1. FETCH USER VISIT HISTORY (Tenant Scoped)
        const userDocId = `${tenantId}_${data.phone}`;
        const userUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLL_USERS}/${userDocId}?key=${API_KEY}`;
        let visitCount = 1;

        try {
            const userRead = await fetch(userUrl);
            if (userRead.ok) {
                const userData = await userRead.json();
                if (userData.fields?.visitCount?.integerValue) {
                    visitCount = parseInt(userData.fields.visitCount.integerValue) + 1;
                }
            }
        } catch (e) { }

        // 2. FETCH TENANT SETTINGS & PROMOTIONS (For Price/Stripe)
        const tenantUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/tenants/${tenantId}?key=${API_KEY}`;
        const now = new Date();
        const monthId = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        const promoUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/promotions/${tenantId}_${monthId}?key=${API_KEY}`;

        let [tenantRes, promoRes] = await Promise.all([
            fetch(tenantUrl),
            fetch(promoUrl)
        ]);

        let tenantData = tenantRes.ok ? await tenantRes.json() : {};
        let promoData = promoRes.ok ? await promoRes.json() : null;

        // 2.5 TRIAL LIMIT CHECK (Phase 3)
        const status = tenantData.fields?.status?.stringValue || "active";
        if (status === "trial") {
            const totalVolumeUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
            const totalQuery = {
                structuredQuery: {
                    from: [{ collectionId: COLL_APP }],
                    where: {
                        fieldFilter: { field: { fieldPath: "tenant_id" }, op: "EQUAL", value: { stringValue: tenantId } }
                    }
                }
            };
            const totalRes = await fetch(totalVolumeUrl, { method: 'POST', body: JSON.stringify(totalQuery) });
            if (totalRes.ok) {
                const totalData = await totalRes.json();
                const totalCount = (totalData[0]?.document) ? totalData.length : 0;
                if (totalCount >= 2 && !data.previewOnly) {
                    return res.status(403).json({
                        error: "TRIAL_LIMIT_REACHED",
                        message: "Límite de prueba alcanzado (2 sesiones). Contacte a soporte para activar el plan premium."
                    });
                }
            }
        }

        // 3. INTELLIGENT PRICE ENGINE & TIERED COMMISSION POLICY
        let basePrice = isMedical ? 1200 : 600;
        if (tenantData.fields?.price?.stringValue) {
            basePrice = parseFloat(tenantData.fields.price.stringValue);
        }

        let finalPrice = basePrice;
        let discountApplied = "ORIGINAL_PRICE";

        // Logic 3.1: Promotions (Intelligent Mode)
        if (promoData && promoData.fields?.text?.stringValue) {
            const promo = promoData.fields.text.stringValue.toLowerCase();
            if ((promo.includes('gratis') || promo.includes('primera')) && visitCount === 1) {
                finalPrice = 0;
                discountApplied = "FIRST_SESSION_FREE";
            } else if (promo.includes('%')) {
                const percentMatch = promo.match(/(\d+)%/);
                if (percentMatch) {
                    const discount = parseInt(percentMatch[1]);
                    finalPrice = basePrice * (1 - discount / 100);
                    discountApplied = `${discount}%_OFF`;
                }
            }
        }

        // Logic 3.2: Tiered Platform Commission (Dynamic Calculation)
        // We fetch current month's total appointments for this tenant to decide the fee
        let monthlyVolume = 1;
        try {
            const volumeUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
            const volumeQuery = {
                structuredQuery: {
                    from: [{ collectionId: COLL_APP }],
                    where: {
                        compositeFilter: {
                            op: "AND",
                            filters: [
                                { fieldFilter: { field: { fieldPath: "tenant_id" }, op: "EQUAL", value: { stringValue: tenantId } } },
                                { fieldFilter: { field: { fieldPath: "timestamp" }, op: "GREATER_THAN_OR_EQUAL", value: { integerValue: String(new Date(now.getFullYear(), now.getMonth(), 1).getTime()) } } }
                            ]
                        }
                    }
                }
            };
            const volumeRes = await fetch(volumeUrl, { method: 'POST', body: JSON.stringify(volumeQuery) });
            if (volumeRes.ok) {
                const volumeData = await volumeRes.json();
                monthlyVolume = volumeData.length || 1;
            }
        } catch (e) { }

        // Decide Fee based on Tier Policy (Default or Custom)
        let t1_rate = parseFloat(tenantData.fields?.fee_tier1?.doubleValue || 0.10);
        let t2_min = parseInt(tenantData.fields?.fee_tier2_min?.integerValue || 20);
        let t2_rate = parseFloat(tenantData.fields?.fee_tier2_rate?.doubleValue || 0.06);
        let t3_min = parseInt(tenantData.fields?.fee_tier3_min?.integerValue || 40);
        let t3_rate = parseFloat(tenantData.fields?.fee_tier3_rate?.doubleValue || 0.04);

        let platformFeeRate = t1_rate;
        if (monthlyVolume >= t3_min) platformFeeRate = t3_rate;
        else if (monthlyVolume >= t2_min) platformFeeRate = t2_rate;

        const platformAmount = finalPrice * platformFeeRate;

        if (data.previewOnly) {
            return res.status(200).json({ success: true, finalPrice: finalPrice });
        }

        // 4. PERSIST APPOINTMENT (With Tenant Isolation)
        const appUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLL_APP}/${data.id}?key=${API_KEY}`;
        const appBody = {
            fields: {
                id: { stringValue: String(data.id) },
                tenant_id: { stringValue: tenantId },
                name: { stringValue: String(data.name) },
                email: { stringValue: String(data.email) },
                phone: { stringValue: String(data.phone) },
                date: { stringValue: String(data.date) },
                time: { stringValue: String(data.time) },
                price: { stringValue: String(finalPrice) },
                discountStatus: { stringValue: discountApplied },
                serviceType: { stringValue: String(data.serviceType || "COACHING") },
                status: { stringValue: "SCHEDULED" },
                timestamp: { integerValue: String(Date.now()) },
                visitNumber: { integerValue: String(visitCount) },
                systemInfo: { stringValue: `PORTALCOACH-B2B-v51.0-${tenantId}` }
            }
        };

        await fetch(appUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appBody)
        });

        // 5. UPDATE AVAILABILITY (Tenant Scoped ID)
        const dayDocId = `${tenantId}_${data.date}`;
        const dayUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLL_DAYS}/${dayDocId}?key=${API_KEY}`;

        const blockTimes = [data.time];
        if (data.doubleSlot) {
            const [h, m] = data.time.split(':').map(Number);
            const nextTime = `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            blockTimes.push(nextTime);
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
                    tenant_id: { stringValue: tenantId },
                    times: { arrayValue: { values: currentTimes.map(t => ({ stringValue: t })) } },
                    ...bookingsUpdates
                }
            })
        });

        // 6. UPDATE USER PROFILE (Tenant Scoped)
        const userUpdateUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLL_USERS}/${userDocId}?key=${API_KEY}`;
        await fetch(userUpdateUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    tenant_id: { stringValue: tenantId },
                    name: { stringValue: String(data.name) },
                    email: { stringValue: String(data.email) },
                    visitCount: { integerValue: String(visitCount) },
                    lastActive: { timestampValue: new Date().toISOString() }
                }
            })
        });

        // 7. STRIPE PHASE 2 PREP (Sandbox Mode)
        const stripeEnabled = tenantData.fields?.stripeEnabled?.booleanValue || false;
        let checkoutUrl = null;
        if (stripeEnabled && !data.isDemo) {
            // Here we would call Stripe API. For now, we return a mock URL.
            checkoutUrl = `https://checkout.stripe.com/pay/cs_test_mock_${data.id}?tenant=${tenantId}`;
        }

        return res.status(200).json({
            success: true,
            finalPrice: finalPrice,
            visitCount: visitCount,
            checkoutUrl: checkoutUrl
        });

    } catch (err) {
        console.error("SaaS_BRIDGE_CRASH:", err);
        return res.status(500).json({ error: "SaaS_BRIDGE_CRASH", details: err.message });
    }
}
