/* ═══════════════════════════════════════
   MOODLY — api/chat.js
   Vercel Serverless Function → Google AI Studio (Primary) + Groq (Fallback) + Jes Empathy Core
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

  const { messages = [], apiKey: clientApiKey, geminiKey: clientGeminiKey } = req.body || {};
  const geminiApiKey = clientGeminiKey || process.env.GEMINI_API_KEY;
  const groqApiKey   = clientApiKey   || process.env.GROQ_API_KEY;

  const safeMsgs = Array.isArray(messages) ? messages : [];
  const sysMsg = safeMsgs.find(m => m.role === 'system')?.content || '';
  const chatMsgs = safeMsgs.filter(m => m.role !== 'system');
  const lastUserMsg = chatMsgs.filter(m => m.role === 'user').slice(-1)[0]?.parts?.[0]?.text || chatMsgs.slice(-1)[0]?.content || '';

  // 1. PRIMARY: Try Google AI Studio (Gemini) with official models & resilient loop
  if (geminiApiKey) {
    const candidateGeminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash-lite'];
    for (const model of candidateGeminiModels) {
      try {
        // Gemini strict format: MUST start with 'user', roles MUST alternate
        const contents = [];
        let lastRole = null;
        for (const m of chatMsgs) {
          const role = m.role === 'assistant' ? 'model' : 'user';
          const text = (m.content || '').trim();
          if (!text) continue;
          if (contents.length === 0 && role !== 'user') continue;
          if (role === lastRole) {
            contents[contents.length - 1].parts[0].text += '\n' + text;
          } else {
            contents.push({ role, parts: [{ text }] });
            lastRole = role;
          }
        }
        if (contents.length === 0) {
          contents.push({ role: 'user', parts: [{ text: lastUserMsg || 'Halo Jes' }] });
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: sysMsg ? { parts: [{ text: sysMsg }] } : undefined,
            contents,
            generationConfig: {
              temperature: 0.75,
              maxOutputTokens: 550,
            }
          }),
          signal: AbortSignal.timeout(6000)
        });

        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          const text = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (text) {
            return res.status(200).json({ reply: text, model });
          }
        } else {
          const errText = await geminiRes.text().catch(() => '');
          console.warn(`[api/chat] Gemini ${model} error status ${geminiRes.status}:`, errText.slice(0, 160));
        }
      } catch (ge) {
        console.warn(`[api/chat] Gemini ${model} timeout/error:`, ge.message);
      }
    }
  }

  // 2. SECONDARY / FALLBACK: Try Groq with ultra-fast models
  if (groqApiKey) {
    const candidateGroqModels = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
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
            messages: safeMsgs,
          }),
          signal: AbortSignal.timeout(5000)
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

  // 3. FINAL SMART SAFETY NET: Immediate empathetic response, never hangs
  const empatheticReplies = [
    'Aku di sini mendengarkanmu dengan tulus. Ceritakan pelan-pelan ya, apa yang paling bikin perasaanmu berat saat ini?',
    'Terima kasih sudah mau berbagi denganku. Luapkan saja semua perasaanmu, kamu aman dan didengar di sini.',
    'Aku paham ini bukan hal yang mudah buatmu. Apapun yang lagi kamu rasakan sekarang, itu wajar dan valid kok.',
    'Tarik napas perlahan ya. Aku siap menemani dan mendengarkan keluh kesahmu tanpa penghakiman.'
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
