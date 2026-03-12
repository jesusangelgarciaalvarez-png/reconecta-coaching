/**
 * PORTALCOACH.COM - PREMIUM AI LOGO GENERATOR (SiliconFlow Proxy)
 * Securely handles logo generation using Flux models via SiliconFlow.
 * Compatible with personal accounts (Gmail/etc).
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { prompt, model = "black-forest-labs/FLUX.1-schnell" } = req.body;
    const SILICON_FLOW_KEY = process.env.SILICON_FLOW_KEY;

    if (!SILICON_FLOW_KEY) {
        console.warn("[API] SILICON_FLOW_KEY not found.");
        return res.status(503).json({ error: "Premium AI not configured" });
    }

    try {
        console.log(`[API] Generating logo with SiliconFlow (${model})...`);
        
        // SiliconFlow API endpoint for image generation
        const response = await fetch('https://api.siliconflow.cn/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SILICON_FLOW_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                image_size: "1024x1024",
                batch_size: 1,
                num_inference_steps: 4 // Schnell is fast
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error?.message || "SiliconFlow API failed");
        }

        // SiliconFlow returns { images: [{ url: '...' }] } or { data: [{ url: '...' }] }
        const imageUrl = data.images?.[0]?.url || data.data?.[0]?.url;
        
        if (!imageUrl) {
            throw new Error("No image URL received from SiliconFlow");
        }

        return res.status(200).json({ success: true, url: imageUrl });

    } catch (e) {
        console.error("[API] SiliconFlow Error:", e);
        return res.status(500).json({ error: e.message });
    }
}
