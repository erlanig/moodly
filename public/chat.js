/* ═══════════════════════════════════════
   MOODLY — chat.js
   Mood AI Chat: Jes dengan memory system
   ═══════════════════════════════════════ */

import { artStore } from './news.js';
import { loadJesMemory, saveJesMemory, loadAIConfig } from './firebase.js';

/* ════════════════
   STATE
════════════════ */
let chatHistory = [];
let chatContext = {};
let jesMemory   = { facts: [] };
let isTyping    = false;

/* ════════════════
   INIT
════════════════ */
export async function initChat(context) {
  chatContext = context || {};
  chatHistory = [];
  renderMessages();
  setInputState(true);

  const saved = await loadJesMemory();
  jesMemory = saved || { facts: [] };

  const opening = buildOpeningMessage(context);
  const openingCap = opening.charAt(0).toUpperCase() + opening.slice(1);
  setTimeout(() => appendMessage('assistant', openingCap, true), 350);
}

/* ════════════════
   OPENING MESSAGE
   FIX: handle 4 kondisi — mood+phase, mood only, phase only, none
════════════════ */
function buildOpeningMessage(ctx) {
  const name  = ctx.userName || 'kamu';
  const mood  = ctx.mood;
  const phase = ctx.cyclePhase;

  const intro = `Hei ${name}, aku Jes. Aku di sini buat mendengarkan kamu apa adanya. Nggak perlu ada yang ditutupi atau dipoles. Cerita dengan santai ya.`;

  let followUp = '';

  /* ── Kondisi 1: Belum check-in, tidak ada data siklus ── */
  if (!mood && !phase) {
    followUp = `Sepertinya kamu belum check-in mood hari ini. Gimana perasaan kamu sekarang? Kamu bisa check-in dulu di menu "Check" atau langsung cerita di sini.`;
  }

  /* ── Kondisi 2: Belum check-in mood, tapi ada data siklus ── */
  else if (!mood && phase) {
    const dayInfo = ctx.dayOfCycle ? ` (hari ke-${ctx.dayOfCycle})` : '';
    const phaseOpeners = {
      mens: `Aku lihat kamu lagi di fase menstruasi${dayInfo}. Gimana kondisi fisik dan perasaanmu hari ini? Kalau terasa lelah, cerita saja.`,
      foll: `Aku lihat kamu lagi di fase folikular${dayInfo}. Energi biasanya mulai pulih di sini. Gimana yang kamu rasakan hari ini?`,
      ovul: `Kamu sedang di fase ovulasi${dayInfo}. Biasanya ini momen energi puncak. Gimana harimu berjalan?`,
      lute: `Aku lihat kamu lagi di fase luteal${dayInfo}. Fase ini wajar kalau terasa lebih sensitif. Gimana keadaanmu sekarang?`,
    };
    followUp = phaseOpeners[phase] || `Gimana perasaan kamu hari ini? Aku di sini mendengarkan.`;
  }

  /* ── Kondisi 3: Ada check-in mood ── */
  else if (mood) {
    const moodMap = {
      'Happy':     `Senang melihat mood kamu hari ini — ${mood.e} ${mood.l}. Ada momen menyenangkan apa yang bikin harimu terasa cerah?`,
      'Oke':       `Aku lihat mood kamu hari ini — ${mood.e} ${mood.l}. Merasa cukup oke itu sudah sangat baik. Ada hal yang mau kamu bagi?`,
      'Biasa':     `Aku lihat mood kamu — ${mood.e} ${mood.l}. Kadang hari yang tenang menyimpan banyak refleksi. Ada yang sedang kamu pikirkan?`,
      'Sedih':     `Aku lihat mood kamu — ${mood.e} ${mood.l}. Terima kasih sudah jujur dengan perasaanmu. Pelan-pelan saja ya, aku di sini menemani.`,
      'Anxious':   `Aku lihat mood kamu — ${mood.e} ${mood.l}. Rasa cemas memang menguras energi. Tarik napas perlahan... Apa yang paling membuat pikiranmu sibuk?`,
      'Frustrasi': `Aku lihat mood kamu — ${mood.e} ${mood.l}. Rasa frustrasi itu sangat valid. Mau cerita apa yang terasa belum sesuai harapan?`,
      'Exhausted': `Aku lihat mood kamu — ${mood.e} ${mood.l}. Hari ini sepertinya cukup berat ya. Istirahatkan dulu pundakmu, apa hal yang paling melelahkan?`,
      'Burnout':   `Aku lihat mood kamu — ${mood.e} ${mood.l}. Tubuh dan pikiranmu mungkin sedang butuh jeda yang nyata. Ceritakan apa yang kamu rasakan.`,
    };
    followUp = moodMap[mood.l] || `Aku lihat mood kamu hari ini — ${mood.e} ${mood.l}. Terima kasih sudah check-in. Ada yang mau kamu ceritakan?`;

    /* ── Tambahan konteks siklus (hanya jika ada) ── */
    if (phase) {
      const dayInfo = ctx.dayOfCycle ? ` (hari ke-${ctx.dayOfCycle})` : '';
      const phaseNotes = {
        mens: `\n\n(Catatan: kamu di fase menstruasi${dayInfo}. Wajar jika fisik terasa lebih rentan lelah. Bersikaplah lembut pada dirimu.)`,
        foll: `\n\n(Catatan: kamu di fase folikular${dayInfo}, energi bertahap kembali naik.)`,
        ovul: `\n\n(Catatan: fase ovulasi${dayInfo}, manfaatkan fase positif ini dengan baik.)`,
        lute: `\n\n(Catatan: fase luteal${dayInfo}. Sensitivitas emosi sangat wajar di fase ini.)`,
      };
      if (phaseNotes[phase]) followUp += phaseNotes[phase];
    }
  }

  return `${intro}\n\n${followUp}`;
}

/* ════════════════
   SEND MESSAGE
════════════════ */
export async function sendMessage(text) {
  if (!text?.trim() || isTyping) return;
  text = text.trim();

  appendMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  setInputState(false);
  showTypingIndicator();

  try {
    const { reply, articleIdx, newFacts } = await callChatAPI(chatHistory, chatContext);
    hideTypingIndicator();
    appendMessage('assistant', reply, true, articleIdx);
    chatHistory.push({ role: 'assistant', content: reply });

    if (newFacts?.length) {
      const merged = [...new Set([...(jesMemory.facts || []), ...newFacts])].slice(0, 20);
      jesMemory = { facts: merged };
      saveJesMemory(jesMemory);
    }
  } catch (e) {
    hideTypingIndicator();
    console.warn('[chat] Using smart local fallback:', e.message);
    // Smart fallback ensures chat always responds gracefully and warmly
    const fallback = getSmartFallbackReply(text, chatContext);
    appendMessage('assistant', fallback, true);
    chatHistory.push({ role: 'assistant', content: fallback });
  } finally {
    setInputState(true);
  }
}

let fallbackTurnCounter = 0;

function getSmartFallbackReply(userText, ctx, history = []) {
  fallbackTurnCounter++;
  const t = userText.toLowerCase();
  const name = ctx?.userName ? ctx.userName : '';
  const greeting = name ? `${name}, ` : '';
  const moodName = ctx?.mood?.l || '';

  // 1. Sapaan awal
  if (t.includes('hai') || t.includes('halo') || t.includes('pagi') || t.includes('malam') || t.includes('siang') || t.includes('sore')) {
    const greetings = [
      `Halo ${name || 'kamu'}. Aku Jes di sini. Gimana perasaan dan harimu sejauh ini?`,
      `Hai ${greeting}senang kamu mampir ke sini. Ada hal yang sedang ingin kamu bagi denganku?`,
      `Halo ${greeting}ruang ini selalu aman buatmu. Apa yang lagi kamu rasakan sekarang?`
    ];
    return greetings[fallbackTurnCounter % greetings.length];
  }

  // 2. Kencan Giur Bistro / Ultah
  if (t.includes('kencan') || t.includes('bistro') || t.includes('giur') || t.includes('ulang tahun') || t.includes('undangan') || t.includes('oktober')) {
    return `Undangan kencan ulang tahun di Giur Bistro tanggal 24 Oktober 2026 nanti pasti sangat berkesan. Jangan lupa siapkan outfit cerah nuansa biru muda ya. Gimana, kamu sudah siap buat hari bahagiamu?`;
  }

  // 3. Pekerjaan / Kuliah / Deadline / Tugas
  if (t.includes('kerja') || t.includes('kantor') || t.includes('kuliah') || t.includes('tugas') || t.includes('deadline') || t.includes('skripsi') || t.includes('bos') || t.includes('atasan') || t.includes('proyek')) {
    const workReplies = [
      `Urusan tanggung jawab dan tuntutan memang seringkali menguras energi tanpa kita sadari. Wajar banget kalau kepalamu terasa penuh, ${greeting}Ada satu hal spesifik dari pekerjaan/tugasmu yang paling bikin tertekan hari ini?`,
      `Rasanya melelahkan ya saat dituntut untuk terus produktif. Jangan lupa bahwa kamu manusia, bukan mesin. Mau cerita bagian mana yang terasa paling berat?`,
      `Menghadapi beban tugas bertubi-tubi itu valid untuk bikin kamu ingin rehat. Apakah kamu punya ruang untuk menarik napas sejenak hari ini?`
    ];
    return workReplies[fallbackTurnCounter % workReplies.length];
  }

  // 4. Hubungan / Pacar / Cinta / Patah Hati / LDR
  if (t.includes('pacar') || t.includes('pasangan') || t.includes('gebetan') || t.includes('putus') || t.includes('ldr') || t.includes('cinta') || t.includes('sayang') || t.includes('hubungan') || t.includes('dia')) {
    const relReplies = [
      `Dinamika hubungan memang bisa sangat menyita emosi dan pikiran kita. Perasaan sedih, bingung, atau kecewa yang kamu rasakan itu sangat manusiawi. Apa yang sebenarnya paling kamu harapkan dari situasi ini?`,
      `Menghadapi hal yang melibatkan orang lain memang rumit karena tidak semua bisa kita kendalikan. Aku mendengarkanmu, ${greeting}ceritakan saja apa yang paling mengganjal di hatimu.`,
      `Kadang yang paling menyakitkan adalah ekspektasi dan rasa tidak dipahami. Kamu berhak untuk didengar dan dihargai seutuhnya.`
    ];
    return relReplies[fallbackTurnCounter % relReplies.length];
  }

  // 5. Cemas / Panik / Overthinking / Takut
  if (t.includes('cemas') || t.includes('takut') || t.includes('anxiety') || t.includes('panik') || t.includes('overthinking') || t.includes('kepikiran') || t.includes('khawatir') || t.includes('deg-degan')) {
    const anxReplies = [
      `Tarik napas perlahan... hembuskan pelan-pelan. Saat ini kamu berada di tempat yang aman. Pikiran memang suka berjalan mendahului kenyataan. Hal apa yang paling membuatmu khawatir saat ini?`,
      `Rasa cemas itu nyata dan menguras tenaga, tapi ingat bahwa pikiranmu bukan fakta masa depan. Pelan-pelan saja ya, ${greeting}apa hal terkecil yang bisa kamu lakukan untuk merasa lebih tenang sekarang?`,
      `Kadang otak kita mencoba melindungi kita dengan cara overthinking berlebihan. Validasi dulu rasa takutmu, tidak apa-apa untuk merasa tidak pasti.`
    ];
    return anxReplies[fallbackTurnCounter % anxReplies.length];
  }

  // 6. Lelah / Capek / Exhausted / Tidur
  if (t.includes('capek') || t.includes('lelah') || t.includes('letih') || t.includes('exhausted') || t.includes('kurang tidur') || t.includes('ngantuk') || t.includes('lemas')) {
    const tiredReplies = [
      `Tubuh dan pikiranmu mungkin sedang berbisik—atau berteriak—bahwa mereka butuh jeda istirahat. Jangan paksakan dirimu untuk selalu kuat hari ini. Kapan terakhir kali kamu bisa tidur dengan benar-benar nyenyak?`,
      `Capek yang menumpuk memang bikin segalanya terasa dua kali lebih berat. Rehat sejenak bukan berarti kalah atau malas, ${greeting}Apakah memungkinkan untuk rehat sejenak malam ini?`,
      `Istirahatkan pundakmu yang tegang itu. Pelan-pelan lepaskan apa yang di luar kendalimu hari ini. Aku di sini menemani.`
    ];
    return tiredReplies[fallbackTurnCounter % tiredReplies.length];
  }

  // 7. Sedih / Menangis / Down / Kecewa / Sakit Hati
  if (t.includes('sedih') || t.includes('nangis') || t.includes('down') || t.includes('kecewa') || t.includes('hancur') || t.includes('patah') || t.includes('sakit hati') || t.includes('sesak')) {
    const sadReplies = [
      `Aku bisa merasakan betapa beratnya beban itu di dadamu. Tidak apa-apa untuk menangis, air mata bukan tanda kelemahan tapi bukti kamu sudah bertahan sejauh ini. Mau cerita apa yang membuatmu sesedih ini?`,
      `Peluk hangat dari jauh untukmu, ${greeting}Kadang hari-hari terasa begitu kelabu. Kamu tidak sendirian, aku siap mendengarkan semua yang ingin kamu luapkan.`,
      `Terima kasih sudah mau berbagi rasa sakit ini denganku. Jangan simpan semuanya sendirian ya.`
    ];
    return sadReplies[fallbackTurnCounter % sadReplies.length];
  }

  // 8. Senang / Syukur / Bahagia / Lega
  if (t.includes('senang') || t.includes('bahagia') || t.includes('lega') || t.includes('alhamdulillah') || t.includes('bersyukur') || t.includes('happy') || t.includes('seru') || t.includes('bagus')) {
    const happyReplies = [
      `Senang sekali mendengarnya! Momen-momen cerah seperti ini sangat berharga untuk disimpan baik-baik dalam memori. Apa hal paling berkesan dari kejadian tadi?`,
      `Energi positifmu terasa sampai ke sini, ${greeting}Nikmati kebahagiaan ini sepenuhnya, kamu layak mendapatkannya!`,
      `Alhamdulillah, semoga rasa tenang dan bahagia ini terus menemani harimu ke depan ya.`
    ];
    return happyReplies[fallbackTurnCounter % happyReplies.length];
  }

  // 9. Ucapan terima kasih
  if (t.includes('makasih') || t.includes('terima kasih') || t.includes('thanks') || t.includes('tengkyu')) {
    return `Sama-sama ${greeting}selalu ada ruang buat kamu di sini kapan pun kamu butuh teman bicara. Jaga dirimu baik-baik ya.`;
  }

  // 10. Kontekstual umum
  const defaultReplies = [
    `Aku mendengarkanmu dengan seksama, ${greeting}Menuangkan isi pikiran ke dalam kata-kata seringkali membantu melonggarkan apa yang terasa sesak. Ada sudut pandang lain yang sedang kamu renungkan?`,
    `Terima kasih sudah jujur dengan apa yang kamu alami. Menyadari perasaan diri adalah langkah awal yang sangat berani. Mau cerita lebih lanjut tentang hal ini?`,
    `Aku di sini menyimak setiap kata yang kamu tulis. Bagaimana perasaanmu setelah menuangkan ini barusan?`
  ];
  return defaultReplies[fallbackTurnCounter % defaultReplies.length];
}

/* ════════════════
   API CALL (Vercel Proxy -> Direct Client Groq/Gemini Fallback)
════════════════ */
async function callChatAPI(history, ctx) {
  const name    = ctx.userName || 'pengguna';
  const mood    = ctx.mood
    ? `${ctx.mood.l} (${ctx.mood.e}), intensitas: ${ctx.intensity || 'tidak diketahui'}`
    : 'belum check-in hari ini';
  const causes  = ctx.causes?.length ? ctx.causes.join(', ') : 'tidak disebutkan';
  const hasMood = !!ctx.mood;

  const phaseNames = {
    mens: 'Menstruasi 🩸',
    foll: 'Folikular 🌱',
    ovul: 'Ovulasi ⭐',
    lute: 'Luteal 🌙',
  };
  const cycleInfo = ctx.cyclePhase
    ? `${phaseNames[ctx.cyclePhase] || ctx.cyclePhase}${ctx.dayOfCycle ? ', hari ke-' + ctx.dayOfCycle : ''}`
    : 'belum ada data siklus';

  const memFacts = jesMemory.facts || [];
  const memStr   = memFacts.length
    ? memFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')
    : 'Belum ada (sesi pertama atau memory kosong)';

  const availableArts = (artStore || []).slice(0, 8).map((a, i) =>
    `[${i}] "${a.title}" — ${a.cat}`
  ).join('\n');

  const systemPrompt = `Kamu adalah Jes, sahabat curhat dalam aplikasi Moodly. Kamu bukan bot — kamu teman paling safe buat diajak ngobrol soal perasaan.

KEPRIBADIAN JES:
Jes ngobrol seperti manusia beneran — hangat, ada empati mendalam, kadang menyapa santai dan dewasa khas Apple iMessage. Tidak kaku, tidak formal, tidak robotik. Tidak pernah mulai dengan "Tentu!", "Baik!", atau "Halo!". Gunakan bahasa Indonesia santai yang natural dan penuh penerimaan.

KONTEKS PENGGUNA:
- Nama: ${name}
- Check-in mood: ${hasMood ? 'sudah' : 'belum hari ini'}
- Mood: ${mood}
- Penyebab: ${causes}
- Fase siklus: ${cycleInfo}

INGATAN JES TENTANG ${name.toUpperCase()}:
${memStr}

FORMAT RESPONS WAJIB:
Kamu HARUS membalas HANYA dengan JSON valid tanpa tanda petik kode:
{"reply":"<pesan Jes>","remember":[],"article":null}

ATURAN RESPONS:
1. Validasi perasaan dulu
2. 2-3 kalimat padat, hangat, tanpa emoji berlebihan
3. Akhiri dengan 1 pertanyaan reflektif yang tulus
4. Jangan menghakimi`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-14),
  ];

  const aiConfig = await loadAIConfig().catch(() => ({ groqKey: '', geminiKey: '' }));

  // 1. Coba Serverless Endpoint /api/chat terlebih dahulu
  let raw = '';
  let apiSuccess = false;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        apiKey: aiConfig.groqKey || undefined,
        geminiKey: aiConfig.geminiKey || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reply) {
        raw = data.reply;
        apiSuccess = true;
      }
    }
  } catch (err) {
    console.warn('[chat] /api/chat unreachable, testing direct client API:', err.message);
  }

  // 2. Direct Client-side Groq jika key tersedia dan serverless belum merespons
  if (!apiSuccess && aiConfig.groqKey) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 450,
          temperature: 0.75,
          messages,
        }),
      });
      if (groqRes.ok) {
        const gData = await groqRes.json();
        raw = gData.choices?.[0]?.message?.content?.trim() || '';
        if (raw) apiSuccess = true;
      }
    } catch (ge) {
      console.warn('[chat] Direct Groq error:', ge.message);
    }
  }

  // 3. Direct Client-side Gemini jika key tersedia
  if (!apiSuccess && aiConfig.geminiKey) {
    try {
      const chatMsgs = history.slice(-14).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiConfig.geminiKey}`;
      const gemRes = await fetch(gUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: chatMsgs,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            responseMimeType: 'application/json',
          }
        })
      });
      if (gemRes.ok) {
        const gemData = await gemRes.json();
        raw = gemData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (raw) apiSuccess = true;
      }
    } catch (gme) {
      console.warn('[chat] Direct Gemini error:', gme.message);
    }
  }

  if (!apiSuccess || !raw) {
    throw new Error('Semua AI endpoint offline, beralih ke Jes Empathy Engine');
  }

  let reply = '', newFacts = [], articleIdx = null;
  try {
    const clean     = raw.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const parsed    = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    reply      = parsed.reply || '';
    newFacts   = parsed.remember || [];
    articleIdx = typeof parsed.article === 'number' ? parsed.article : null;
  } catch {
    const replyMatch = raw.match(/"reply"\s*:\s*"([\s\S]*?)(?:",\s*"remember"|"\s*\})/);
    if (replyMatch) {
      reply = replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else {
      reply = raw
        .replace(/```json|```/g, '')
        .replace(/"reply"\s*:\s*"/g, '')
        .replace(/"remember"\s*:\s*\[[\s\S]*?\]/g, '')
        .replace(/"article"\s*:\s*[\d\w"null]+/g, '')
        .replace(/[{}"]/g, '')
        .replace(/,\s*$/gm, '')
        .trim();
    }
  }
  if (reply) reply = reply.charAt(0).toUpperCase() + reply.slice(1);

  return { reply, articleIdx, newFacts };
}

/* ════════════════
   RENDER
════════════════ */
function renderMessages() {
  const wrap = document.getElementById('chat-messages');
  if (wrap) wrap.innerHTML = '';
}

function appendMessage(role, text, animate = false, articleIdx = null) {
  const wrap = document.getElementById('chat-messages');
  if (!wrap) return;

  const div = document.createElement('div');
  div.className = `chat-msg ${role === 'user' ? 'chat-user' : 'chat-ai'}`;
  if (animate) div.classList.add('chat-in');

  if (role === 'assistant') {
    const avatar = document.createElement('img');
    avatar.src = 'img/jes-memoji.svg';
    avatar.alt = 'Jes Memoji';
    avatar.className = 'chat-msg-memoji';
    avatar.style.cssText = 'width:26px!important;height:26px!important;min-width:26px!important;max-width:26px!important;min-height:26px!important;max-height:26px!important;border-radius:50%!important;object-fit:cover!important;margin-right:8px!important;margin-bottom:2px!important;align-self:flex-end!important;flex-shrink:0!important;background:#ffffff!important;box-shadow:0 1px 3px rgba(0,0,0,0.08)!important;';
    div.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  if (role === 'assistant') bubble.style.cssText = 'display:flex;flex-direction:column;flex:1;max-width:calc(100% - 40px);';

  if (role === 'assistant') {
    const textNode = document.createElement('span');
    textNode.className = 'chat-bubble-text';
    textNode.style.whiteSpace = 'pre-wrap';
    textNode.textContent = text;
    bubble.appendChild(textNode);

    if (articleIdx !== null && artStore?.[articleIdx]) {
      const art = artStore[articleIdx];
      const artEl = document.createElement('div');
      artEl.className = 'chat-art-rec';
      artEl.innerHTML = `
        <div class="chat-art-label">📖 Bacaan pendukung</div>
        <div class="chat-art-card" onclick="window._openArt(${articleIdx})">
          <span class="chat-art-em" style="font-size:16px;">📚</span>
          <div>
            <div class="chat-art-title">${art.title}</div>
            <div class="chat-art-src">${art.source} · ${art.readTime}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="var(--p1, #ff2d55)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>`;
      bubble.appendChild(artEl);
    }






  } else {
    bubble.textContent = text;
    bubble.style.whiteSpace = 'pre-wrap';
  }

  div.appendChild(bubble);
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;

  if (animate) requestAnimationFrame(() => div.classList.remove('chat-in'));
}

function showTypingIndicator() {
  isTyping = true;
  const wrap = document.getElementById('chat-messages');
  if (!wrap) return;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-ai';
  div.id = 'chat-typing';
  div.innerHTML = `<img src="img/jes-memoji.svg" alt="Jes" class="chat-msg-memoji" style="width:26px!important;height:26px!important;min-width:26px!important;max-width:26px!important;min-height:26px!important;max-height:26px!important;border-radius:50%!important;object-fit:cover!important;margin-right:8px!important;margin-bottom:2px!important;align-self:flex-end!important;flex-shrink:0!important;background:#ffffff!important;box-shadow:0 1px 3px rgba(0,0,0,0.08)!important;">
  <div class="chat-bubble chat-typing-bubble" style="max-width:calc(100% - 40px);">
    <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
  </div>`;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

function hideTypingIndicator() {
  isTyping = false;
  document.getElementById('chat-typing')?.remove();
}

function setInputState(enabled) {
  const inp = document.getElementById('chat-input');
  const btn = document.getElementById('chat-send');
  if (inp) inp.disabled = !enabled;
  if (btn) btn.disabled = !enabled;
  if (enabled && inp) inp.focus();
}

/* ════════════════
   QUICK REPLIES
════════════════ */
export function buildQuickReplies(mood) {
  const base = [
    'Pengen cerita lebih lanjut',
    'Ada yang lagi bikin kepikiran',
    'Nggak tau harus mulai dari mana',
    'Makasih ya Jes',
  ];
  const byMood = {
    'Sedih':     ['Aku ngerasa sendirian', 'Capek nahan semuanya', 'Perasaanku lagi kalut'],
    'Anxious':   ['Pikiran nggak bisa tenang', 'Besok ada hal penting', 'Takut banyak hal'],
    'Frustrasi': ['Ngerasa nggak dihargai', 'Rencana berantakan', 'Rasanya pengen teriak'],
    'Burnout':   ['Capek tapi harus terus', 'Kehilangan motivasi', 'Butuh jeda istirahat'],
    'Exhausted': ['Tidur rasanya nggak cukup', 'Badan dan pikiran letih', 'Ngerasa kewalahan'],
    'Happy':     ['Mau cerita hal seru!', 'Hari ini terasa menyenangkan', 'Ada kabar baik nih'],
    'Oke':       ['Cukup stabil kok', 'Lumayan tenang hari ini', 'Ada yang mau diceritain'],
  };
  const specific = mood?.l ? (byMood[mood.l] || []) : [];
  return [...specific.slice(0, 2), ...base.slice(0, 4 - specific.slice(0, 2).length)];
}