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

  const sysMsg = messages.find(m => m.role === 'system')?.content || '';
  const chatMsgs = messages.filter(m => m.role !== 'system');
  const lastUserMsg = chatMsgs.filter(m => m.role === 'user').slice(-1)[0]?.parts?.[0]?.text || chatMsgs.slice(-1)[0]?.content || '';

  // 1. PRIMARY: Try Google AI Studio (Gemini) with fast 4.5s timeout
  if (geminiApiKey) {
    try {
      const contents = chatMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`;
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: sysMsg ? { parts: [{ text: sysMsg }] } : undefined,
          contents,
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 500,
          }
        }),
        signal: AbortSignal.timeout(4500)
      });

      if (geminiRes.ok) {
        const gData = await geminiRes.json();
        const text = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (text) {
          return res.status(200).json({ reply: text, model: 'gemini-flash-latest' });
        }
      } else {
        const errText = await geminiRes.text().catch(() => '');
        console.warn(`[api/chat] Gemini responded with status ${geminiRes.status}:`, errText.slice(0, 200));
        // If quota exceeded (429) or invalid/no balance (400), don't retry other gemini models, immediately go to Groq
      }
    } catch (ge) {
      console.warn('[api/chat] Gemini primary engine timed out or error:', ge.message);
    }
  }

  // 2. SECONDARY / FALLBACK: Try Groq with 4.5s timeout
  if (groqApiKey) {
    const candidateGroqModels = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (const model of candidateGroqModels) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
          signal: AbortSignal.timeout(4500)
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const reply = data.choices?.[0]?.message?.content?.trim() || '';
          if (reply) {
            return res.status(200).json({ reply, model: `groq (${model})` });
          }
        }
      } catch (e) {
        console.warn(`[api/chat] Groq error on ${model}:`, e.message);
      }
    }
  }

  // 3. FINAL SAFETY NET: Always return HTTP 200 with warm, empathetic Jes reply
  // This ensures the client NEVER hangs or stays in "mengetik..." state indefinitely!
  const empatheticReplies = [
    'Aku di sini mendengarkanmu. Ceritakan pelan-pelan ya, apa yang paling bikin perasaanmu berat saat ini?',
    'Terima kasih sudah mau berbagi denganku. Luapkan saja semua unek-unekmu, kamu aman di sini.',
    'Aku paham ini bukan hal yang mudah buatmu. Apapun yang lagi kamu rasakan sekarang, itu wajar dan valid kok.',
    'Tarik napas dalam-dalam dulu ya. Aku siap menemani dan mendengarkan keluh kesahmu hari ini.'
  ];
  const chosenReply = empatheticReplies[Math.floor(Math.random() * empatheticReplies.length)];
  const fallbackJson = JSON.stringify({
    reply: chosenReply,
    remember: [],
    article: null
  });

  return res.status(200).json({
    reply: fallbackJson,
    model: 'jes-empathy-core',
    isFallback: true
  });
}
