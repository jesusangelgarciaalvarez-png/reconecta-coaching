/**
 * PORTALCOACH API - SEND WHATSAPP OTP (Twilio Integration)
 * Version: v1.0
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { phone, tenant_id } = req.body;
    if (!phone) return res.status(400).json({ error: 'Falta el teléfono' });

    const PROJECT_ID = "reconecta-ed650";
    const API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM";
    
    // TWILIO CREDENTIALS (TO BE SET IN VERCEL ENV)
    // Note: Using placeholders for now, the user will need to add these.
    const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886";

    // 1. Generate 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        // 1.5 CHECK PERSISTENT VERIFICATION & RATE LIMIT
        const tid = (tenant_id || "general").toLowerCase();
        const userDocId = `${tid}_${phone}`;
        const userUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${userDocId}?key=${API_KEY}`;
        const userRes = await fetch(userUrl);
        
        if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.fields && userData.fields.isVerified && userData.fields.isVerified.booleanValue) {
                return res.status(200).json({ success: true, alreadyVerified: true, message: "Usuario ya verificado" });
            }
        }

        // DAILY RATE LIMIT CHECK
        const usageId = `usage_${phone}_${today}`;
        const usageUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/otp_usage/${usageId}?key=${API_KEY}`;
        const usageRes = await fetch(usageUrl);
        let count = 0;

        if (usageRes.ok) {
            const usageData = await usageRes.json();
            count = parseInt(usageData.fields.count.integerValue || "0");
            if (count >= 3) {
                return res.status(429).json({ error: "RATE_LIMIT_REACHED", message: "Límite de mensajes diarios alcanzado (3). Intente mañana." });
            }
        }

        // 2. Persist OTP in Firestore (with 5-min expiration)
        const otpId = `otp_${phone}`;
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/verification_codes/${otpId}?key=${API_KEY}`;
        
        await fetch(firestoreUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    phone: { stringValue: phone },
                    code: { stringValue: otp },
                    expiresAt: { timestampValue: new Date(Date.now() + 5 * 60 * 1000).toISOString() },
                    tenant_id: { stringValue: tenant_id || "general" }
                }
            })
        });

        // 3. Send via Twilio (WhatsApp)
        if (TWILIO_SID && TWILIO_AUTH_TOKEN) {
            const auth = btoa(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`);
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
            const body = new URLSearchParams({
                To: `whatsapp:+${phone}`,
                From: TWILIO_WHATSAPP_NUMBER,
                Body: `Tu código de seguridad para PortalCoach es: ${otp}. Válido por 5 minutos.`
            });

            const twilioRes = await fetch(twilioUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: body.toString()
            });

        } else {
            // SANDBOX MODE: Log to console if no credentials
            console.warn(`[SECURITY] SANDBOX OTP for ${phone}: ${otp}`);
        }

        // 4. Update Usage Analytics
        await fetch(usageUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: {
                    phone: { stringValue: phone },
                    count: { integerValue: (count + 1).toString() },
                    lastRequest: { timestampValue: new Date().toISOString() }
                }
            })
        });

        return res.status(200).json({ 
            success: true, 
            message: "Código enviado",
            sandbox: !TWILIO_SID // Tell frontend if we are in sandbox
        });

    } catch (err) {
        console.error("OTP_API_CRASH:", err);
        return res.status(500).json({ error: "SaaS_BRIDGE_CRASH", details: err.message });
    }
}
