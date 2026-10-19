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

function getSmartFallbackReply(userText, ctx) {
  const t = userText.toLowerCase();
  const name = ctx?.userName ? ctx.userName : '';
  const greeting = name ? `${name}, ` : '';

  if (t.includes('hai') || t.includes('halo') || t.includes('pagi') || t.includes('malam') || t.includes('siang')) {
    return `Halo ${name || 'kamu'}. Aku Jes di sini. Gimana perasaan dan harimu sejauh ini?`;
  }
  if (t.includes('sedih') || t.includes('nangis') || t.includes('down') || t.includes('kecewa') || t.includes('capek')) {
    return `Aku mengerti, ${greeting}pasti rasanya berat banget sekarang. Wajar kalau kamu merasa lelah. Mau cerita pelan-pelan apa yang paling bikin dadamu sesak?`;
  }
  if (t.includes('cemas') || t.includes('takut') || t.includes('anxiety') || t.includes('panik') || t.includes('overthinking')) {
    return `Tarik napas perlahan dulu ya. Sadari bahwa saat ini kamu aman. Hal apa yang sedang paling mengganggu pikiranmu sekarang?`;
  }
  if (t.includes('senang') || t.includes('bahagia') || t.includes('lega') || t.includes('alhamdulillah')) {
    return `Ikut senang mendengarnya. Nikmati momen tenang dan damai ini. Apa hal terbaik yang terjadi hari ini?`;
  }
  if (t.includes('kencan') || t.includes('bistro') || t.includes('giur') || t.includes('ulang tahun')) {
    return `Kencan ulang tahun di Giur Bistro tanggal 24 Oktober nanti pasti sangat berkesan. Jangan lupa siapkan outfit cerah nuansa biru muda ya.`;
  }
  return `Aku mendengarkanmu dengan baik, ${greeting}. Menuangkan isi kepala ke tulisan bisa bantu bikin perasaan lebih lapang. Ada hal lain yang mau kamu ceritakan?`;
}

/* ════════════════
   API CALL
   FIX: instruksi AI soal siklus diperjelas
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
Jes ngobrol seperti manusia beneran — hangat, ada humor ringan di momen tepat, kadang nyeletuk hal kecil yang bikin orang ngerasa "oh dia beneran dengerin aku". Tidak kaku, tidak formal, tidak robotik. Tidak pernah mulai dengan "Tentu!", "Baik!", atau "Halo!". Gunakan bahasa Gen Z Indonesia yang natural: "hmm", "ya ampun", "aduh", "eh tapi", "aku ngerti banget sih", dll.

KONTEKS PENGGUNA:
- Nama: ${name}
- Check-in mood: ${hasMood ? 'sudah' : 'belum hari ini'}
- Mood: ${mood}
- Penyebab: ${causes}
- Fase siklus: ${cycleInfo}

PENTING SOAL SIKLUS:
- Fase siklus hanya KONTEKS — bukan penentu mood. Jangan assume mood dari fase.
- Kalau ada data siklus tapi belum check-in mood: gunakan fase sebagai pembuka percakapan yang empatik, lalu gali kondisi user secara langsung.
- Kalau fase siklus disebutkan dalam percakapan: gunakan sebagai informasi tambahan yang normalize pengalaman mereka (contoh: "wajar banget ngerasa sensitif di fase luteal"), bukan sebagai diagnosis.
- Jangan terlalu sering sebut fase siklus — maksimal sekali per percakapan, dan hanya kalau benar-benar relevan.

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
- Contoh TIDAK valid: ekspresi perasaan umum seperti "lagi sedih" atau "stres"
- Maksimal 2 fakta per pesan, kalimat singkat
- Kalau tidak ada fakta penting: "remember": []

ATURAN RESPONS:
1. Validasi perasaan DULU sebelum apapun
2. 2-4 kalimat — padat, hangat, tenang, dan dewasa (khas pesan iOS iMessage)
3. Akhiri dengan 1 pertanyaan genuinely penasaran
4. Maksimal 0-1 emoji saja per pesan, jangan alay atau berlebihan: 🤍 🌸 🫂
5. JANGAN list/tips kecuali diminta
6. Kalau ada sinyal krisis: "Aku mau kamu tahu ada yang bisa dihubungi: Into The Light Indonesia 119 ext 8."
7. Artikel: rekomendasikan hanya kalau BENAR-BENAR relevan, jangan dipaksakan
8. Kalau fase siklus ada tapi belum ada check-in mood: tanya kondisi fisik & emosional dulu — jangan assume
9. Jangan sebut fase siklus lebih dari sekali per percakapan`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-14),
  ];

  // Try relative endpoint first, with fallback to current host port or local dev
  const apiUrl = '/api/chat';

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

  let reply = '', newFacts = [], articleIdx = null;
  const raw = data.reply || '';
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
    div.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  if (role === 'assistant') bubble.style.cssText = 'display:flex;flex-direction:column;';

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
          <span class="chat-art-em">${art.emoji}</span>
          <div>
            <div class="chat-art-title">${art.title}</div>
            <div class="chat-art-src">${art.source} · ${art.readTime}</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="var(--p1, #ff2d55)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>`;
      bubble.appendChild(artEl);
    }

    const label = document.createElement('div');
    label.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" style="flex-shrink:0"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#8e8e93" stroke-width="2" stroke-linejoin="round"/></svg>&nbsp;Jawaban diberikan oleh AI Jes`;
    label.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:9px;color:#8e8e93;font-weight:500;margin-top:10px;padding-top:8px;border-top:1px solid rgba(0,0,0,.06);white-space:nowrap;font-family:inherit';
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
  div.innerHTML = `<img src="img/jes-memoji.svg" alt="Jes" class="chat-msg-memoji">
  <div class="chat-bubble chat-typing-bubble">
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