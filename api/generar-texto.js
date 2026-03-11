/**
 * PORTALCOACH API - AI COPYWRITING FOR COACHES
 */

const GEMINI_API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM"; // Using the project key, assuming Gemini is enabled

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send({ message: 'Only POST allowed' });

    const { pagina, tipo_seccion, ideas_previas } = req.body;

    const systemPrompt = `Eres un experto copywriter especializado en Marketing para Coaches y Desarrollo Personal.
Toma las ideas base del coach y transfórmalas en un texto persuasivo, empático y profesional que conecte emocionalmente con su cliente ideal.

REGLAS CRÍTICAS:
1. Usa un tono que inspire confianza y transformación. No seas genérico.
2. Devuelve UNICAMENTE el objeto JSON sin bloques de código markdown, sin prefijos y sin sufijos. 
3. Formato JSON requerido:
   - "titulo": Máximo 3 palabras (impactante).
   - "contenido": Máximo 50 palabras (enriquecido y profesional).
   - "image_keyword": Una sola palabra en inglés que describa el concepto visual (Ej: "mountain", "calm", "path").
4. Si las ideas previas son escasas, usa tu conocimiento para expandirlas manteniendo la esencia del tipo de sección.`;

    const orientation = pagina === 'mision' ? 'Quién soy y propósito' :
        pagina === 'servicios' ? 'Qué ofrezco' :
            pagina === 'metodo' ? 'Cómo trabajo' :
                'Pestaña de inicio / Portada del sitio';

    const userPrompt = `Página del sitio: ${pagina} (Orientación: ${orientation})
Tipo de bloque UI: ${tipo_seccion}
Ideas base del coach: "${ideas_previas}"`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const aiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
                }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            })
        });

        const data = await aiResponse.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
            // Stronger cleaning: find first { and last }
            const start = rawText.indexOf('{');
            const end = rawText.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                const cleanText = rawText.substring(start, end + 1);
                const parsed = JSON.parse(cleanText);
                return res.status(200).json(parsed);
            }
            return res.status(500).json({ error: "Invalid JSON format from AI", raw: rawText });
        } else {
            return res.status(500).json({ error: "IA failed to generate content", details: data });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
