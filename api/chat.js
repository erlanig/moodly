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

  try {
    const { messages } = req.body;

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 400,
        temperature: 0.8,
        messages,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      return res.status(groqRes.status).json({ error: err });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || '';
    return res.status(200).json({ reply });

  } catch (e) {
    console.error('[api/chat] error:', e.message);
    return res.status(500).json({ error: e.message });
  }
}