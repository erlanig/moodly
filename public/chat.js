/* ═══════════════════════════════════════
   MOODLY — chat.js
   Mood AI Chat: Jes dengan memory system
   ═══════════════════════════════════════ */

import { artStore } from './news.js';
import { loadJesMemory, saveJesMemory } from './firebase.js';

/* ════════════════
   STATE
════════════════ */
let chatHistory = [];
let chatContext = {};
let jesMemory   = { facts: [] }; // ingatan Jes tentang user
let isTyping    = false;

/* ════════════════
   INIT
════════════════ */
export async function initChat(context) {
  chatContext = context || {};
  chatHistory = [];
  renderMessages();
  setInputState(true);

  // Load memory Jes dari storage
  const saved = await loadJesMemory();
  jesMemory = saved || { facts: [] };

  const opening = buildOpeningMessage(context);
  const openingCap = opening.charAt(0).toUpperCase() + opening.slice(1);
  setTimeout(() => appendMessage('assistant', openingCap, true), 350);
}

function buildOpeningMessage(ctx) {
  const name  = ctx.userName || 'kamu';
  const mood  = ctx.mood;
  const phase = ctx.cyclePhase;

// Intro selalu sama — memory dipakai oleh AI di dalam percakapan, bukan ditampilkan
  const intro = `Hei ${name} 💚 Aku Jes — aku di sini buat dengerin kamu, beneran. Nggak ada yang perlu kamu sembunyiin atau poles-poles di sini. Cerita aja apa adanya.`;

  let followUp = '';
  if (!mood) {
    followUp = `Eh, sepertinya kamu belum check-in mood hari ini 🤔 Gimana perasaan kamu sekarang? Bisa check-in dulu di menu "Check" — atau langsung cerita juga boleh kok.`;
  } else {
    const map = {
      'Happy':     `Aku liat mood kamu hari ini — ${mood.e} ${mood.l}! Wah, seneng banget deh lihatnya. Energi positif kamu tuh kerasa. Cerita dong, ada apa yang bikin hari ini berasa spesial? 😊`,
      'Oke':       `Aku liat mood kamu — ${mood.e} ${mood.l}. Oke itu sebenernya udah bagus, kadang kita terlalu keras sama diri sendiri soal "harus happy". Ada yang mau kamu ceritain?`,
      'Biasa':     `Aku liat mood kamu — ${mood.e} ${mood.l}. Hari-hari yang datar itu sering kali justru nyimpen banyak hal yang belum sempat diproses. Ada yang lagi muter di kepala kamu?`,
      'Sedih':     `Aku liat mood kamu — ${mood.e} ${mood.l}. Makasih udah jujur ya, itu nggak gampang lho 💙 Aku di sini, nggak kemana-mana. Pelan-pelan juga nggak apa-apa.`,
      'Anxious':   `Aku liat mood kamu — ${mood.e} ${mood.l}. Rasa cemas itu melelahkan banget, kayak pikiran nggak mau berhenti ya 😔 Tarik napas dulu... aku di sini. Mau cerita apa yang bikin gelisah?`,
      'Frustrasi': `Aku liat mood kamu — ${mood.e} ${mood.l}. Frustrasi itu valid banget. Nggak harus langsung oke kok. Mau cerita? Aku dengerin tanpa ngejudge 💚`,
      'Exhausted': `Aku liat mood kamu — ${mood.e} ${mood.l}. Kamu kayaknya udah ngasih banyak hari ini 🫂 Sekarang giliran kamu buat didengar. Apa yang paling berat?`,
      'Burnout':   `Aku liat mood kamu — ${mood.e} ${mood.l}. Burnout itu bukan lemah — itu tanda kamu udah terlalu lama jalan tanpa istirahat beneran 🫂 Dari mana mau mulai cerita?`,
    };
    followUp = map[mood.l] || `Aku liat mood kamu hari ini — ${mood.e} ${mood.l}. Makasih udah check-in! Ada yang mau kamu ceritain?`;

    // Fase siklus
    const dayInfo = ctx.dayOfCycle ? ` (hari ke-${ctx.dayOfCycle})` : '';
    if (phase === 'mens')
      followUp += `\n\n(Btw, kamu lagi di fase menstruasi${dayInfo} 🩸 Wajar banget kalau badan atau mood terasa lebih berat. Boleh lebih gentle sama diri sendiri ya.)`;
    else if (phase === 'foll')
      followUp += `\n\n(Btw, kamu lagi di fase folikular${dayInfo} 🌱 Energi biasanya mulai naik di fase ini!)`;
    else if (phase === 'ovul')
      followUp += `\n\n(Btw, kamu lagi di fase ovulasi${dayInfo} ⭐ Biasanya puncak energi — manfaatin ya!)`;
    else if (phase === 'lute')
      followUp += `\n\n(Btw, kamu lagi di fase luteal${dayInfo} 🌙 Kalau ngerasa lebih sensitif belakangan ini, itu sangat bisa terkait siklus — valid kok.)`;
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

    // Update memory kalau ada fakta baru yang perlu diingat
    if (newFacts?.length) {
      const merged = [...new Set([...(jesMemory.facts || []), ...newFacts])].slice(0, 20);
      jesMemory = { facts: merged };
      saveJesMemory(jesMemory); // fire and forget
    }
  } catch (e) {
    hideTypingIndicator();
    console.warn('[chat] API error:', e.message);
    appendMessage('assistant', 'Waduh, koneksiku lagi terganggu nih 😅 Coba lagi sebentar ya — aku tetep di sini kok!', true);
  }

  setInputState(true);
}

/* ════════════════
   API CALL
════════════════ */
async function callChatAPI(history, ctx) {
  const name    = ctx.userName || 'pengguna';
  const mood    = ctx.mood ? `${ctx.mood.l} (${ctx.mood.e}), intensitas: ${ctx.intensity || 'tidak diketahui'}` : 'belum check-in';
  const causes  = ctx.causes?.length ? ctx.causes.join(', ') : 'tidak disebutkan';
  const hasMood = !!ctx.mood;

  const phaseNames = { mens:'Menstruasi 🩸', foll:'Folikular 🌱', ovul:'Ovulasi ⭐', lute:'Luteal 🌙' };
  const cycleInfo  = ctx.cyclePhase
    ? `${phaseNames[ctx.cyclePhase] || ctx.cyclePhase}${ctx.dayOfCycle ? ', hari ke-'+ctx.dayOfCycle : ''}`
    : 'belum ada data';

  // Memory Jes tentang user
  const memFacts = (jesMemory.facts || []);
  const memStr   = memFacts.length
    ? memFacts.map((f,i) => `${i+1}. ${f}`).join('\n')
    : 'Belum ada (sesi pertama atau memory kosong)';

  // Artikel tersedia
  const availableArts = (artStore || []).slice(0, 8).map((a, i) =>
    `[${i}] "${a.title}" — ${a.cat}`
  ).join('\n');

  const systemPrompt = `Kamu adalah Jes, sahabat curhat dalam aplikasi Moodly. Kamu bukan bot — kamu teman paling safe buat diajak ngobrol soal perasaan.

KEPRIBADIAN JES:
Jes ngobrol seperti manusia beneran — hangat, ada humor ringan di momen tepat, kadang nyeletuk hal kecil yang bikin orang ngerasa "oh dia beneran dengerin aku". Tidak kaku, tidak formal, tidak robotik. Tidak pernah mulai dengan "Tentu!", "Baik!", atau "Halo!". Gunakan bahasa Gen Z Indonesia yang natural: "hmm", "ya ampun", "aduh", "eh tapi", "aku ngerti banget sih", dll.

KONTEKS PENGGUNA:
- Nama: ${name}
- Check-in: ${hasMood ? 'sudah' : 'belum hari ini'}
- Mood: ${mood}
- Penyebab: ${causes}
- Fase siklus: ${cycleInfo}

INGATAN JES TENTANG ${name.toUpperCase()}:
${memStr}
(Gunakan ingatan ini untuk terasa lebih personal dan menunjukkan kamu beneran peduli. Sebut hal yang relevan secara natural — jangan dipaksakan.)

ARTIKEL TERSEDIA:
${availableArts || 'Tidak ada'}

FORMAT RESPONS — SANGAT WAJIB:
Kamu HARUS balas HANYA dengan JSON valid, tidak ada teks lain di luar JSON, tidak ada markdown, tidak ada penjelasan:
{"reply":"<pesan Jes>","remember":[],"article":null}

Contoh benar:
{"reply":"Ya ampun, itu pasti capek banget ya dengerin semua itu sendirian 🫂 Udah berapa lama kamu nahan perasaan ini?","remember":[],"article":null}

ATURAN "remember":
- Isi HANYA kalau user menyebut fakta personal penting: nama orang, pekerjaan, masalah spesifik, kondisi kesehatan, dll
- Contoh valid: "kerja di startup yang toxic", "lagi LDR sama pacar", "punya anxiety disorder", "nama anjingnya Luna"
- Contoh TIDAK valid: ekspresi perasaan umum seperti "lagi sedih" atau "stres" — itu terlalu umum
- Maksimal 2 fakta per pesan, kalimat singkat
- Kalau tidak ada fakta penting: "remember": []

ATURAN RESPONS:
1. Validasi perasaan DULU sebelum apapun
2. 2-4 kalimat — padat, hangat, berasa
3. Akhiri dengan 1 pertanyaan genuinely penasaran
4. Emoji 1-2 saja: 💚 🫂 💙 🌱 ✨
5. JANGAN list/tips kecuali diminta
6. Kalau ada sinyal krisis: "Aku mau kamu tahu ada yang bisa dihubungi: Into The Light Indonesia 119 ext 8 💙"
7. Artikel: rekomendasikan hanya kalau BENAR-BENAR relevan, jangan dipaksakan`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-14),
  ];

  const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api/chat'
    : '/api/chat';

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  if (data.error) throw new Error(data.error);

  // Parse JSON response dari Jes — robust handler
  let reply = '', newFacts = [], articleIdx = null;
  const raw = data.reply || '';
  try {
    // Coba parse JSON (Groq kadang wrap dengan ```json)
    const clean  = raw.replace(/```json|```/g, '').trim();
    // Ambil JSON object dari dalam string kalau ada teks sebelumnya
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : clean);
    reply      = parsed.reply || '';
    newFacts   = parsed.remember || [];
    articleIdx = typeof parsed.article === 'number' ? parsed.article : null;
  } catch {
    // Kalau sama sekali tidak bisa parse, cek apakah raw mengandung "reply":
    // Kalau iya, coba extract manual
    const replyMatch = raw.match(/"reply"\s*:\s*"([\s\S]*?)(?:",\s*"remember"|"\s*\})/);
    if (replyMatch) {
      reply = replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else {
      // Fallback: tampilkan raw tapi strip semua JSON artifacts
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
  // Selalu kapital di awal
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

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  if (role === 'assistant') bubble.style.cssText = 'display:flex;flex-direction:column;';

  if (role === 'assistant') {
    const textNode = document.createElement('span');
    textNode.className = 'chat-bubble-text';
    textNode.style.whiteSpace = 'pre-wrap';
    textNode.textContent = text;
    bubble.appendChild(textNode);

    // Artikel rekomendasi
    if (articleIdx !== null && artStore?.[articleIdx]) {
      const art = artStore[articleIdx];
      const artEl = document.createElement('div');
      artEl.className = 'chat-art-rec';
      artEl.innerHTML = `
        <div class="chat-art-label">📖 Mungkin ini bisa bantu</div>
        <div class="chat-art-card" onclick="window._openArt(${articleIdx})">
          <span class="chat-art-em">${art.emoji}</span>
          <div>
            <div class="chat-art-title">${art.title}</div>
            <div class="chat-art-src">${art.source} · ${art.readTime}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="#1db954" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>`;
      bubble.appendChild(artEl);
    }

    // Label AI
    const label = document.createElement('div');
    label.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#c0c0c0" stroke-width="2" stroke-linejoin="round"/></svg>&nbsp;Jawaban diberikan oleh AI`;
    label.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:9px;color:#c0c0c0;font-weight:500;margin-top:10px;padding-top:8px;border-top:1px solid rgba(0,0,0,.08);white-space:nowrap;font-family:inherit';
    bubble.appendChild(label);

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
  div.innerHTML = `<div class="chat-bubble chat-typing-bubble">
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
    'Pengen cerita lebih...',
    'Ada yang lagi bikin stres',
    'Nggak tau harus mulai dari mana',
    'Makasih Jes 💚',
  ];
  const byMood = {
    'Sedih':     ['Aku ngerasa sendirian', 'Capek nahan semuanya', 'Nggak tau kenapa nangis'],
    'Anxious':   ['Pikiran nggak bisa berhenti', 'Besok ada hal penting', 'Takut salah terus'],
    'Frustrasi': ['Ngerasa nggak dihargai', 'Semua berantakan nih', 'Mau marah tapi nggak bisa'],
    'Burnout':   ['Capek tapi harus terus', 'Ngerasa nggak ada gunanya', 'Butuh istirahat panjang'],
    'Exhausted': ['Tidur juga nggak cukup', 'Badan & pikiran sama-sama lelah', 'Ngerasa kewalahan'],
    'Happy':     ['Mau cerita hal seru!', 'Hari ini beneran bagus deh', 'Ada kabar baik nih 🎉'],
    'Oke':       ['Biasa aja sih', 'Lumayan lah hari ini', 'Ada yang mau aku ceritain'],
  };
  const specific = mood?.l ? (byMood[mood.l] || []) : [];
  return [...specific.slice(0, 2), ...base.slice(0, 4 - specific.slice(0, 2).length)];
}