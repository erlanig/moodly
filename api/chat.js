/* ═══════════════════════════════════════
   MOODLY — api/chat.js
   Vercel Serverless Function → Google AI Studio (Primary) + Groq (Fallback)
   ═══════════════════════════════════════ */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, apiKey: clientApiKey, geminiKey: clientGeminiKey } = req.body || {};
  const geminiApiKey = clientGeminiKey || process.env.GEMINI_API_KEY;
  const groqApiKey   = clientApiKey   || process.env.GROQ_API_KEY;

  // 1. PRIMARY: Try Google AI Studio (Gemini)
  if (geminiApiKey) {
    try {
      const sysMsg = messages.find(m => m.role === 'system')?.content || '';
      const chatMsgs = messages.filter(m => m.role !== 'system');
      const contents = chatMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      // Try gemini-flash-latest first, then gemini-1.5-flash
      const candidateModels = ['gemini-flash-latest', 'gemini-1.5-flash', 'gemini-2.5-flash'];
      for (const model of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const geminiRes = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: sysMsg ? { parts: [{ text: sysMsg }] } : undefined,
              contents,
              generationConfig: {
                temperature: 0.75,
                maxOutputTokens: 600,
              }
            })
          });

          if (geminiRes.ok) {
            const gData = await geminiRes.json();
            const text = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            if (text) {
              return res.status(200).json({ reply: text, model: `gemini (${model})` });
            }
          }
        } catch (innerErr) {
          console.warn(`[api/chat] Error on ${model}:`, innerErr.message);
        }
      }
    } catch (ge) {
      console.warn('[api/chat] Gemini primary engine error:', ge.message);
    }
  }

  // 2. FALLBACK: Try Groq
  if (groqApiKey) {
    async function callGroq(model) {
      return await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 450,
          temperature: 0.75,
          messages,
        }),
      });
    }

    try {
      let modelUsed = 'llama-3.3-70b-versatile';
      let groqRes = await callGroq(modelUsed);

      if (!groqRes.ok) {
        modelUsed = 'llama-3.1-8b-instant';
        groqRes = await callGroq(modelUsed);
      }

      if (groqRes.ok) {
        const data = await groqRes.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || '';
        return res.status(200).json({ reply, model: `groq (${modelUsed})` });
      }
    } catch (e) {
      console.warn('[api/chat] Groq fallback error:', e.message);
    }
  }

  return res.status(502).json({
    error: 'Layanan AI saat ini offline. Menggunakan Jes Empathy Engine lokal.',
    fallbackOffline: true
  });
}
