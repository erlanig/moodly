/* ═══════════════════════════════════════
   MOODLY — safeplace.js
   Safe Place: Rohani — Al-Quran, Jadwal Sholat, Kajian
   Integrasi AI: Ayat of the Day (Groq)
   ═══════════════════════════════════════ */

import { checkConnection } from './firebase.js';

// Konfigurasi API Groq
const GROQ_API_KEY = "MASUKKAN_API_KEY_GROQ_DISINI"; 

/* ════════════════
   CONSTANTS & DATA
════════════════ */
let prayerCache = null;
let prayerCacheDate = null;

const FEATURED_SURAHS = [
  { no: 1,   name: 'Al-Fatihah',  arti: 'Pembuka', theme: '🌟', ayat: 7 },
  { no: 18,  name: 'Al-Kahfi',    arti: 'Gua',     theme: '🌿', ayat: 110 },
  { no: 36,  name: 'Ya-Sin',      arti: 'Ya Sin',  theme: '💫', ayat: 83 },
  { no: 67,  name: 'Al-Mulk',     arti: 'Kerajaan', theme: '🌙', ayat: 30 },
  { no: 112, name: 'Al-Ikhlas',  arti: 'Ikhlas',   theme: '🤍', ayat: 4 }
];

const KAJIAN_LIST = [
  { 
    id: 'k1', emoji: '🤲', category: 'Ketenangan', title: 'Ketika Hati Terasa Berat', 
    source: 'QS. Ar-Ra\'d: 28', readTime: '3 menit',
    content: `"Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram." (QS. Ar-Ra'd: 28)\n\nPerasaan berat adalah bagian dari ujian. Allah tidak membebani hamba-Nya melebihi kemampuannya.\n\n✦ Coba ucapkan: "Hasbunallah wa ni'mal wakiil".`
  },
  { 
    id: 'k5', emoji: '🤍', category: 'Mental Health', title: 'Islam dan Kesehatan Mental', 
    source: 'HR. Abu Dawud', readTime: '4 menit',
    content: `Depresi bukan lemah iman. Rasulullah bersabda: "Berobatlah, karena Allah tidak menciptakan penyakit kecuali menciptakan pula obatnya."\n\n✦ Ikhtiar medis dan psikologis adalah bagian dari sunnah.`
  }
];

const DOA_LIST = [
  { emoji: '🌅', name: 'Bangun Tidur', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', latin: 'Alhamdulillaahil ladzii ahyaanaa...', arti: 'Segala puji bagi Allah yang telah menghidupkan kami...', faedah: 'Dibaca saat bangun tidur.' },
  { emoji: '😴', name: 'Tidur', arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', latin: 'Bismikallaahumma amuutu wa ahyaa', arti: 'Dengan nama-Mu ya Allah, aku mati dan aku hidup.', faedah: 'Dibaca sebelum tidur.' },
  { emoji: '😰', name: 'Gelisah', arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', latin: 'Hasbunallah wa ni\'mal wakiil', arti: 'Cukuplah Allah menjadi penolong kami.', faedah: 'Dibaca saat merasa cemas.' },
  { emoji: '🍽️', name: 'Makan', arabic: 'بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ', latin: 'Bismillaahi wa \'alaa barakatillaah', arti: 'Dengan nama Allah dan atas berkah Allah.', faedah: 'Dibaca sebelum makan.' }
];

/* ════════════════
   AI GENERATOR: AYAT OF THE DAY
════════════════ */
async function getAIAyat() {
  const today = new Date().toISOString().split('T')[0];
  const cached = JSON.parse(localStorage.getItem('moodly_ayat_ai') || 'null');

  if (cached && cached.date === today) return cached.data;

  try {
    const prompt = `Berikan 1 ayat Al-Quran (teks Arab, terjemahan Indonesia, dan sumber Surah:Ayat) yang bertema ketenangan hati atau motivasi. Format JSON: {"arabic": "...", "id": "...", "src": "..."}`;
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });
    const json = await response.json();
    const ayatData = JSON.parse(json.choices[0].message.content);
    localStorage.setItem('moodly_ayat_ai', JSON.stringify({ date: today, data: ayatData }));
    return ayatData;
  } catch (e) {
    return { arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", id: "Allah tidak membebani seseorang melainkan sesuai dengan kesanggupannya.", src: "QS. Al-Baqarah: 286" };
  }
}

/* ════════════════
   INIT & RENDER
════════════════ */
export function initSafePlace() {
  renderSafePlace();
}

function renderSafePlace() {
  const screen = document.getElementById('safeplace');
  if (!screen) return;

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam';

  screen.innerHTML = `
    <div class="tb" style="display: flex; justify-content: flex-end; padding: 16px 0;">
      <div class="sync-dot" style="width:8px;height:8px;border-radius:50%;background:#1db954;flex-shrink:0" title="Rohani Online"></div>
    </div>

    <div class="sp-hero" style="text-align: left; margin-bottom: 32px; padding-top: 8px;">
      <div style="font-size: 12px; font-weight: 800; color: #8FA89B; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">ROHANI & KETENANGAN</div>
      <div style="font-size: 44px; font-weight: 900; color: #153223; line-height: 1.05; letter-spacing: -1px; display: flex; align-items: flex-end; gap: 8px;">
        <div>Safe<br>Place</div>
        <span style="font-size: 34px; margin-bottom: 4px;">🕌</span>
      </div>
      <div style="margin-top: 16px; font-size: 15px; color: #666;">${greeting}, hati yang tenang dimulai dari sini 🤍</div>

      <div id="sp-ayat-container" style="margin-top: 24px; min-height: 120px;">
        <div style="padding: 20px; background: #f0f4f2; border-radius: 16px; border: 1px dashed #ccc; text-align:center;">
          <div style="font-size: 12px; color: #888;">Mencari ayat untukmu hari ini...</div>
        </div>
      </div>
    </div>

    <div class="slbl" style="font-weight: 800; color: #153223; font-size: 18px; margin-top: 32px;">🕐 Jadwal Sholat</div>
    <div class="sp-prayer-card" id="sp-prayer-card">
       <div style="padding: 20px; text-align:center; font-size: 12px; color: #888;">Mendeteksi lokasi...</div>
    </div>

    <div class="slbl" style="font-weight: 800; color: #153223; font-size: 18px; margin-top: 32px;">📖 Al-Quran</div>
    <div class="sp-quran-card">
      <div class="sp-surah-grid">
        ${FEATURED_SURAHS.map(s => `
          <button class="sp-surah-btn" onclick="window._openSurah(${s.no})">
            <span class="sp-surah-no">${s.no}</span>
            <div class="sp-surah-info">
              <div class="sp-surah-name">${s.name}</div>
              <div class="sp-surah-arti">${s.arti} · ${s.ayat} ayat</div>
            </div>
            <span class="sp-surah-em">${s.theme}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="slbl" style="font-weight: 800; color: #153223; font-size: 18px; margin-top: 32px;">💡 Kajian Islami</div>
    <div class="sp-kajian-list">
      ${KAJIAN_LIST.map(k => `
        <div class="sp-kajian-card" onclick="window._openKajian('${k.id}')">
          <div class="sp-kajian-top">
            <span class="sp-kajian-em">${k.emoji}</span>
            <div class="sp-kajian-meta">
              <div class="sp-kajian-cat">${k.category}</div>
              <div class="sp-kajian-title">${k.title}</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="slbl" style="font-weight: 800; color: #153223; font-size: 18px; margin-top: 32px;">🤲 Doa Harian</div>
    <div class="sp-doa-grid">
      ${DOA_LIST.map((d,i) => `
        <button class="sp-doa-btn" onclick="window._showDoa(${i})">
          <span>${d.emoji}</span>
          <span style="font-size: 13px;">${d.name}</span>
        </button>
      `).join('')}
    </div>
    <div style="height:40px"></div>
  `;

  renderAIAyat();
  loadAndRenderPrayer();
}

async function renderAIAyat() {
  const container = document.getElementById('sp-ayat-container');
  if (!container) return;
  const data = await getAIAyat();
  container.innerHTML = `
    <div class="sp-ayat-box" style="padding: 20px; background: #f8faf9; border-radius: 16px; border: 1px solid #e2e8e4;">
      <div style="font-size: 24px; font-weight: bold; text-align: right; margin-bottom: 12px; color: #153223; line-height: 1.8; font-family: serif;">${data.arabic}</div>
      <div style="font-size: 14px; font-style: italic; color: #4a5c52; margin-bottom: 8px;">"${data.id}"</div>
      <div style="font-size: 11px; font-weight: 700; color: #8FA89B; text-transform: uppercase;">— ${data.src}</div>
    </div>`;
}

/* ════════════════
   PRAYER TIMES
════════════════ */
async function loadAndRenderPrayer() {
  const card = document.getElementById('sp-prayer-card');
  if (!card) return;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const timings = await fetchPrayerTimes(pos.coords.latitude, pos.coords.longitude);
      if (timings) renderPrayerTimes(timings, "Lokasi Anda");
    }, () => {
      fetchPrayerTimes(-6.2088, 106.8456).then(t => renderPrayerTimes(t, "Jakarta"));
    });
  }
}

async function fetchPrayerTimes(lat, lon) {
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=20`);
    const json = await res.json();
    return json.data.timings;
  } catch { return null; }
}

function renderPrayerTimes(timings, city) {
  const card = document.getElementById('sp-prayer-card');
  if (!card || !timings) return;
  const list = [ {n:'Subuh',t:timings.Fajr}, {n:'Dzuhur',t:timings.Dhuhr}, {n:'Ashar',t:timings.Asr}, {n:'Maghrib',t:timings.Maghrib}, {n:'Isya',t:timings.Isha} ];
  card.innerHTML = `
    <div style="font-size: 11px; color: #8FA89B; margin-bottom: 12px; font-weight: 700;">📍 ${city.toUpperCase()}</div>
    <div style="display: flex; justify-content: space-between; gap: 8px;">
      ${list.map(p => `<div style="flex: 1; text-align: center; background: #fff; padding: 10px 4px; border-radius: 12px; border: 1px solid #f0f0f0;">
          <div style="font-size: 10px; color: #888; margin-bottom: 4px;">${p.n}</div>
          <div style="font-size: 13px; font-weight: 800; color: #153223;">${p.t}</div>
        </div>`).join('')}
    </div>`;
}

/* ════════════════
   MODAL ACTIONS
════════════════ */
export async function openSurah(no) {
  const modal = document.getElementById('surah-modal');
  if (!modal) return;
  modal.classList.add('show');
  document.getElementById('surah-modal-content').innerHTML = '<p style="text-align:center; padding:20px;">Memuat Surah...</p>';
  
  try {
    const res = await fetch(`https://api.alquran.cloud/v1/surah/${no}/id.indonesian`);
    const json = await res.json();
    const s = json.data;
    document.getElementById('surah-modal-title').textContent = s.name + " (" + s.englishName + ")";
    document.getElementById('surah-modal-content').innerHTML = s.ayahs.map(a => `
      <div style="margin-bottom:20px; border-bottom:1px solid #eee; padding-bottom:10px;">
        <div style="font-size:22px; text-align:right; margin-bottom:10px; line-height:1.8;">${a.text} <span style="font-size:14px; color:#888;">(${a.numberInSurah})</span></div>
        <div style="font-size:14px; color:#445;">${a.text}</div>
      </div>`).join('');
  } catch (e) { document.getElementById('surah-modal-content').innerHTML = 'Gagal memuat surah.'; }
}

export function openKajian(id) {
  const k = KAJIAN_LIST.find(x => x.id === id);
  const modal = document.getElementById('kajian-modal');
  if (!modal || !k) return;
  document.getElementById('kajian-modal-title').textContent = k.title;
  document.getElementById('kajian-modal-content').innerHTML = `<p style="white-space:pre-wrap;">${k.content}</p><br><small>Sumber: ${k.source}</small>`;
  modal.classList.add('show');
}

export function showDoa(idx) {
  const d = DOA_LIST[idx];
  const modal = document.getElementById('doa-modal');
  if (!modal || !d) return;
  document.getElementById('doa-modal-name').textContent = d.name;
  document.getElementById('doa-modal-ar').textContent = d.arabic;
  document.getElementById('doa-modal-lat').textContent = d.latin;
  document.getElementById('doa-modal-arti').textContent = d.arti;
  modal.classList.add('show');
}

// Global Bindings
window._openSurah = openSurah;
window._openKajian = openKajian;
window._showDoa = showDoa;
window._closeSurah = () => document.getElementById('surah-modal')?.classList.remove('show');
window._closeKajian = () => document.getElementById('kajian-modal')?.classList.remove('show');
window._closeDoa = () => document.getElementById('doa-modal')?.classList.remove('show');