/* ═══════════════════════════════════════
   MOODLY — api/chat.js
   Vercel Serverless Function → Groq & Gemini Proxy
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
  const groqApiKey = clientApiKey || process.env.GROQ_API_KEY;
  const geminiApiKey = clientGeminiKey || process.env.GEMINI_API_KEY;

  if (!groqApiKey && !geminiApiKey) {
    return res.status(500).json({
      error: 'API Key AI belum dikonfigurasi (atur GROQ_API_KEY atau GEMINI_API_KEY di dashboard admin / environment Vercel)',
      needsKey: true
    });
  }

  // 1. Try Groq if key available
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
        // Fallback model
        modelUsed = 'llama-3.1-8b-instant';
        groqRes = await callGroq(modelUsed);
      }

      if (groqRes.ok) {
        const data = await groqRes.json();
        const reply = data.choices?.[0]?.message?.content?.trim() || '';
        return res.status(200).json({ reply, model: modelUsed });
      }
    } catch (e) {
      console.warn('[api/chat] Groq error:', e.message);
    }
  }

  // 2. Try Gemini if Groq not available or failed
  if (geminiApiKey) {
    try {
      const sysMsg = messages.find(m => m.role === 'system')?.content || '';
      const chatMsgs = messages.filter(m => m.role !== 'system');
      const contents = chatMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sysMsg }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            responseMimeType: 'application/json',
          }
        })
      });

      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        const text = gData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return res.status(200).json({ reply: text, model: 'gemini-1.5-flash' });
      } else {
        const errTxt = await geminiRes.text();
        console.warn('[api/chat] Gemini error response:', errTxt);
      }
    } catch (ge) {
      console.warn('[api/chat] Gemini error:', ge.message);
    }
  }

  return res.status(502).json({ error: 'Layanan AI saat ini tidak merespons.' });
}