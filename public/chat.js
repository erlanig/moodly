/* ═══════════════════════════════════════
   MOODLY — chat.js
   Mood AI Chat: curhat ke AI empatik
   ═══════════════════════════════════════ */

import { artStore } from './news.js';

/* ════════════════
   STATE
════════════════ */
let chatHistory = [];
let chatContext = {};
let isTyping    = false;

/* ════════════════
   INIT
════════════════ */
export function initChat(context) {
  chatContext = context || {};
  chatHistory = [];
  renderMessages();
  setInputState(true);
  setTimeout(() => appendMessage('assistant', buildOpeningMessage(context), true), 350);
}

function buildOpeningMessage(ctx) {
  const name   = ctx.userName || 'kamu';
  const mood   = ctx.mood;
  const phase  = ctx.cyclePhase;

  const intro = `Hei ${name} 💚 Aku Jes — aku di sini buat dengerin kamu, beneran. Nggak ada yang perlu kamu sembunyiin atau poles-poles di sini. Cerita aja apa adanya, aku nggak akan ngejudge.`;

  let followUp = '';
  if (!mood) {
    followUp = `Eh, sepertinya kamu belum check-in mood hari ini 🤔 Gimana perasaan kamu sekarang? Kalau mau, coba check-in dulu di menu "Check" — biar aku bisa lebih ngerti kamu. Tapi kalau mau langsung cerita juga, aku dengerin kok.`;
  } else {
    const map = {
      'Happy':     `Aku liat mood kamu hari ini — ${mood.e} ${mood.l}! Wah, seneng banget deh lihatnya. Energi positif kamu tuh kerasa lho. Cerita dong, ada apa yang bikin hari ini berasa spesial? 😊`,
      'Oke':       `Aku liat mood kamu — ${mood.e} ${mood.l}. Oke itu sebenernya udah bagus, kadang kita terlalu keras sama diri sendiri soal "harus happy". Ada yang mau kamu ceritain hari ini?`,
      'Biasa':     `Aku liat mood kamu hari ini — ${mood.e} ${mood.l}. Hari-hari yang datar itu sering kali justru nyimpen banyak hal yang belum sempat diproses. Ada yang lagi muter di kepala kamu?`,
      'Sedih':     `Aku liat mood kamu — ${mood.e} ${mood.l}. Makasih udah jujur ya, itu nggak gampang lho 💙 Aku di sini, nggak akan kemana-mana. Kalau mau cerita, aku dengerin — pelan-pelan juga nggak apa-apa.`,
      'Anxious':   `Aku liat mood kamu — ${mood.e} ${mood.l}. Rasa cemas itu melelahkan banget, kayak pikiran nggak mau berhenti berputar ya 😔 Tarik napas dulu... aku di sini. Mau cerita apa yang lagi bikin kamu gelisah?`,
      'Frustrasi': `Aku liat mood kamu — ${mood.e} ${mood.l}. Frustrasi itu valid, dan kamu boleh ngerasainnya. Nggak harus langsung "oke" kok. Mau cerita apa yang lagi bikin kamu kesel? Aku dengerin tanpa ngehakimin 💚`,
      'Exhausted': `Aku liat mood kamu — ${mood.e} ${mood.l}. Kamu kayaknya udah ngasih banyak banget hari ini — buat orang lain, buat kerjaan, buat semuanya 🫂 Sekarang giliran kamu buat didengar. Apa yang paling berat hari ini?`,
      'Burnout':   `Aku liat mood kamu — ${mood.e} ${mood.l}. Burnout itu bukan berarti kamu lemah — itu justru tanda kamu udah terlalu lama jalan tanpa istirahat yang beneran 🫂 Kamu nggak harus kuat sendirian. Mau mulai dari mana?`,
    };
    followUp = map[mood.l] || `Aku liat mood kamu hari ini — ${mood.e} ${mood.l}. Makasih udah check-in ya! Ada yang mau kamu ceritain seputar hari ini?`;

    if (phase === 'mens')
      followUp += `\n\n(Btw, kalau badan kamu lagi nggak enak karena mens, itu wajar banget — kamu boleh lebih gentle sama diri sendiri hari ini 🩸)`;
    else if (phase === 'lute')
      followUp += `\n\n(Btw, kalau belakangan ini kamu ngerasa lebih sensitif atau gampang overflow, itu bisa ada kaitannya sama fase siklus kamu — normal dan valid kok 🌙)`;
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
    const { reply, articleIdx } = await callChatAPI(chatHistory, chatContext);
    hideTypingIndicator();
    appendMessage('assistant', reply, true, articleIdx);
    chatHistory.push({ role: 'assistant', content: reply });
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
  const phase   = ctx.cyclePhase || 'tidak diketahui';
  const hasMood = !!ctx.mood;

  // Siapkan daftar artikel yang tersedia untuk referensi
  const availableArts = (artStore || []).slice(0, 6).map((a, i) =>
    `[${i}] "${a.title}" — ${a.cat} (${a.source})`
  ).join('\n');

  const systemPrompt = `Kamu adalah Jes, sahabat curhat dalam aplikasi Moodly. Kamu bukan bot, bukan terapis — kamu teman yang paling safe buat diajak ngobrol soal perasaan.

SIAPA JES:
Jes berbicara seperti manusia beneran — ada jeda, ada empati yang terasa organik, kadang nyeletuk hal kecil yang bikin orang ngerasa "oh dia beneran dengerin aku". Jes nggak pernah terasa seperti sedang membaca script. Hangatnya genuine, bukan performatif.

KONTEKS PENGGUNA:
- Nama: ${name}
- Check-in: ${hasMood ? 'sudah' : 'BELUM hari ini'}
- Mood: ${mood}
- Penyebab: ${causes}
- Fase siklus: ${phase}

ARTIKEL TERSEDIA HARI INI:
${availableArts || 'Tidak ada artikel tersedia'}

CARA JES MERESPONS — PENTING BANGET:
1. DENGARKAN dulu sepenuhnya. Validasi dulu. Jangan langsung solusi.
2. Gunakan bahasa yang terasa kayak lagi ngobrol — boleh ada "hmm", "ya ampun", "aduh", "eh wait", "aku ngerti banget sih"
3. Panjang respons: 2-4 kalimat. Padat, hangat, berasa.
4. Akhiri dengan 1 pertanyaan yang genuinely ingin tahu — bukan basa-basi.
5. Emoji maksimal 1-2, pilih yang hangat: 💚 🫂 💙 🌱 ✨
6. JANGAN kasih list/tips kecuali diminta langsung.
7. Kalau topik obrolan relate sama salah satu artikel yang tersedia, di AKHIR respons kamu boleh rekomendasikan dengan format PERSIS ini di baris terpisah:
   [ARTIKEL:0] atau [ARTIKEL:1] dst — sesuai nomor artikel di atas
   Hanya rekomendasikan kalau benar-benar relevan dan natural, bukan dipaksakan.
8. Kalau ada sinyal krisis (menyakiti diri, hopeless berat): respons dengan empati dalam, lalu: "Aku mau kamu tahu ada yang bisa dihubungi: Into The Light Indonesia 119 ext 8 — mereka ada buat dengerin kamu juga 💙"
9. Kamu Jes. Teman. Bukan bot.`;

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

  let raw = data.reply || '';

  // Cari apakah ada rekomendasi artikel di respons
  const artMatch = raw.match(/\[ARTIKEL:(\d+)\]/);
  let articleIdx = null;
  if (artMatch) {
    articleIdx = parseInt(artMatch[1]);
    raw = raw.replace(/\[ARTIKEL:\d+\]\s*/g, '').trim();
  }

  return { reply: raw, articleIdx };
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
  // Pastikan bubble AI flex-column agar label stack di bawah
  if (role === 'assistant') {
    bubble.style.cssText = 'display:flex;flex-direction:column;';
  }

  if (role === 'assistant') {
    // Teks
    const textNode = document.createElement('span');
    textNode.className = 'chat-bubble-text';
    textNode.style.whiteSpace = 'pre-wrap';
    textNode.textContent = text;
    bubble.appendChild(textNode);

    // Rekomendasi artikel kalau ada
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

    // Label AI — inline style agar tidak bergantung CSS cache
    const label = document.createElement('div');
    label.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#c0c0c0" stroke-width="2" stroke-linejoin="round"/></svg>&nbsp;Jawaban diberikan oleh AI`;
    label.style.cssText = [
      'display:flex', 'align-items:center', 'gap:4px',
      'font-size:9px', 'color:#c0c0c0', 'font-weight:500',
      'margin-top:10px', 'padding-top:8px',
      'border-top:1px solid rgba(0,0,0,.08)',
      'white-space:nowrap', 'font-family:inherit'
    ].join(';');
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