/**
 * PORTALCOACH API - AI COPYWRITING FOR COACHES
 */

const GEMINI_API_KEY = "AIzaSyAP36MKFxUd37pxaSdsJzBvXmdK7wV1XZM"; // Using the project key, assuming Gemini is enabled

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send({ message: 'Only POST allowed' });

    const { pagina, tipo_seccion, ideas_previas } = req.body;

    const systemPrompt = `Actúa como copywriter para coaches. Toma las ideas previas y redacta un texto profesional para la sección indicada. Devuelve únicamente un JSON con las claves 'titulo' (max 5 palabras) y 'contenido' (max 40 palabras).`;
    const userPrompt = `Página: ${pagina}\nTipo de Sección: ${tipo_seccion}\nIdeas previas: ${ideas_previas}`;

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
            const parsed = JSON.parse(rawText);
            return res.status(200).json(parsed);
        } else {
            return res.status(500).json({ error: "IA failed to generate content", details: data });
        }
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
