/* ═══════════════════════════════════════
   MOODLY — api/chat.js
   Vercel Serverless Function → Groq proxy
   ═══════════════════════════════════════ */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  async function callGroq(model) {
    return await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        temperature: 0.8,
        messages,
      }),
    });
  }

  try {
    const { messages } = req.body;
    let modelUsed = 'llama-3.3-70b-versatile';
    let groqRes = await callGroq(modelUsed);

    // Retry once if primary fails
    if (!groqRes.ok) {
      console.warn(`[api/chat] primary attempt 1 failed (${groqRes.status}), retrying in 800ms...`);
      await new Promise(r => setTimeout(r, 800));
      groqRes = await callGroq(modelUsed);
    }

    // Fallback model if primary still fails
    if (!groqRes.ok) {
      console.warn(`[api/chat] primary failed (${groqRes.status}), switching to fallback model...`);
      modelUsed = 'llama-3.1-8b-instant';
      groqRes = await callGroq(modelUsed);
    }

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(groqRes.status).json({ error: err, status: groqRes.status });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '';
    return res.status(200).json({ reply, model: modelUsed });

  } catch (e) {
    console.error('[api/chat] error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}