/* ═══════════════════════════════════════
   Vercel Serverless Function — /api/anthropic
═══════════════════════════════════════ */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' }); return; }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method : 'POST',
      headers: {
        'Content-Type'      : 'application/json',
        'x-api-key'         : apiKey,
        'anthropic-version' : '2023-06-01',
        // ✅ HAPUS anthropic-beta — web search sudah GA, tidak perlu beta header
      },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();
    
    // Log error dari Anthropic supaya mudah debug
    if (!upstream.ok) {
      console.error('[api/anthropic] upstream error:', upstream.status, JSON.stringify(data));
    }
    
    res.status(upstream.status).json(data);
  } catch (e) {
    console.error('[api/anthropic] fetch error:', e.message);
    res.status(502).json({ error: e.message });
  }
}