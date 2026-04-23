/* ═══════════════════════════════════════
   MOODLY — safeplace.js
   Safe Place: Rohani — Al-Quran, Jadwal Sholat, Kajian
   ═══════════════════════════════════════ */

/* ════════════════
   KAJIAN ISLAMI
   Curated local content — no API needed
════════════════ */
const KAJIAN_LIST = [
  {
    id: 'k1',
    emoji: '🤲',
    category: 'Ketenangan Hati',
    title: 'Ketika Hati Terasa Berat',
    content: `"Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram." (QS. Ar-Ra'd: 28)

Perasaan berat, gelisah, atau sedih adalah bagian dari ujian hidup yang Allah berikan. Kamu tidak sendirian merasakan ini. Bahkan para nabi pun pernah menangis dan merasa lelah.

Yang perlu kamu ingat: Allah tidak menguji seorang hamba melebihi kemampuannya. Setiap rasa berat yang kamu rasakan hari ini adalah bukti bahwa Allah percaya kamu mampu melewatinya.

✦ Coba luangkan 5 menit untuk duduk diam, tarik napas dalam, dan ucapkan: "Hasbunallah wa ni'mal wakiil" — Cukuplah Allah sebagai pelindung kami, dan Dia sebaik-baik pelindung.`,
    source: 'Dari QS. Ar-Ra\'d: 28',
    readTime: '3 menit',
  },
  {
    id: 'k2',
    emoji: '🌙',
    category: 'Doa & Dzikir',
    title: 'Dzikir Pagi untuk Memulai Hari',
    content: `Memulai pagi dengan dzikir adalah investasi terbaik untuk harimu. Rasulullah SAW mengajarkan beberapa dzikir singkat namun luar biasa manfaatnya:

📿 "Bismillahilladzii laa yadurru ma'asmihi syai'un fil ardhi wa laa fis samaa'i wa huwas samii'ul 'aliim" (3x)
— Artinya: Dengan nama Allah yang tidak ada sesuatu pun yang membahayakan bersama nama-Nya, baik di bumi maupun di langit, dan Dia Maha Mendengar lagi Maha Mengetahui.

📿 "Alhamdulillaahilladzi ahyaanaa ba'da maa amaatanaa wa ilaihin nusyuur" (1x)
— Segala puji bagi Allah yang telah menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dikembalikan.

✦ Konsistensi dzikir pagi lebih baik dari dzikir panjang yang bolong-bolong. 5 menit setiap pagi, cukup.`,
    source: 'HR. Abu Dawud & Tirmidzi',
    readTime: '4 menit',
  },
  {
    id: 'k3',
    emoji: '💪',
    category: 'Kesabaran',
    title: 'Sabar Bukan Berarti Diam',
    content: `Sabar sering disalahpahami sebagai "mendiamkan semua masalah dan pura-pura baik-baik saja." Padahal sabar yang sesungguhnya jauh lebih aktif dari itu.

"Dan bersabarlah kamu bersama orang-orang yang menyeru Tuhannya..." (QS. Al-Kahfi: 28)

Sabar artinya:
→ Tetap bergerak meski lelah
→ Tetap berdoa meski belum terkabul
→ Tetap berbaik sangka pada Allah meski situasi terasa gelap

Yang tidak termasuk sabar: menekan perasaan, pura-pura kuat, tidak mau minta tolong. Itu bukan sabar — itu menyiksa diri.

✦ Menangis, curhat, minta bantuan, istirahat — semua itu boleh dan tidak membatalkan kesabaran kamu.`,
    source: 'QS. Al-Kahfi: 28',
    readTime: '3 menit',
  },
  {
    id: 'k4',
    emoji: '🌟',
    category: 'Rasa Syukur',
    title: 'Syukur yang Mengubah Perspektif',
    content: `"Sesungguhnya jika kamu bersyukur, pasti Kami akan menambah nikmat kepadamu." (QS. Ibrahim: 7)

Syukur bukan tentang pura-pura happy. Syukur adalah kemampuan untuk melihat nikmat di tengah kesulitan — dan itu butuh latihan.

Coba praktik "3 hal kecil" setiap malam sebelum tidur:
1. Satu hal yang berjalan baik hari ini (sekecil apapun)
2. Satu orang yang kamu syukuri kehadirannya
3. Satu kondisi tubuh yang sehat & berfungsi normal

Otak manusia secara alami lebih mudah merekam hal negatif (negativity bias). Latihan syukur ini melatih otak untuk melihat lebih seimbang.

✦ "Alhamdulillah" bukan sekadar kata — ia adalah pernyataan bahwa kamu melihat kebaikan Allah di hari ini.`,
    source: 'QS. Ibrahim: 7',
    readTime: '4 menit',
  },
  {
    id: 'k5',
    emoji: '🤍',
    category: 'Kesehatan Mental',
    title: 'Islam dan Kesehatan Mental',
    content: `Tidak ada dalam Islam yang melarang seseorang mencari bantuan profesional untuk kesehatan mentalnya. Justru sebaliknya.

Imam Al-Ghazali dalam Ihya Ulumuddin menulis panjang tentang penyakit hati (amradul qulub) dan cara penyembuhannya — termasuk muhasabah (introspeksi), mujahadah (perjuangan melawan nafsu), dan muraqabah (kesadaran diri).

Yang perlu kamu pahami:
→ Depresi bukan lemah iman
→ Anxiety bukan kurang tawakkal
→ Burnout bukan hukuman Allah

Rasulullah SAW bersabda: "Berobatlah, karena Allah tidak menciptakan penyakit kecuali menciptakan pula obatnya." (HR. Abu Dawud)

✦ Terapi psikologi, konseling, check-in mood seperti di Moodly — semua termasuk ikhtiar yang dianjurkan Islam.`,
    source: 'HR. Abu Dawud',
    readTime: '4 menit',
  },
  {
    id: 'k6',
    emoji: '🌱',
    category: 'Tawakkal',
    title: 'Ikat Untamu, Baru Bertawakkal',
    content: `Seorang sahabat bertanya kepada Rasulullah: "Apakah aku ikat untaku atau langsung aku tawakkal?" Rasulullah menjawab: "Ikat, kemudian tawakkal." (HR. Tirmidzi)

Tawakkal yang sesungguhnya bukan pasrah tanpa usaha. Ia adalah kombinasi dari:
1. Usaha semaksimal yang kamu bisa
2. Doa yang tulus kepada Allah
3. Penyerahan hasil sepenuhnya kepada-Nya

Kalau kamu lagi merasa stuck — sudah usaha keras tapi belum ada hasilnya — mungkin ini saat yang tepat untuk evaluasi: apakah "ikatan unta"-mu sudah cukup kuat? Atau kamu sudah berusaha dengan baik dan ini memang waktunya untuk bersabar?

✦ Keduanya valid. Yang tidak valid adalah tawakkal tanpa usaha, atau usaha tanpa tawakkal.`,
    source: 'HR. Tirmidzi',
    readTime: '3 menit',
  },
];

/* ════════════════
   SURAH DATA (mini — 10 popular surahs)
════════════════ */
const FEATURED_SURAHS = [
  { no: 1,   name: 'Al-Fatihah',   ayat: 7,  arti: 'Pembuka',          theme: '🌟' },
  { no: 2,   name: 'Al-Baqarah',  ayat: 286, arti: 'Sapi Betina',      theme: '📖' },
  { no: 18,  name: 'Al-Kahfi',    ayat: 110, arti: 'Gua',              theme: '🌿' },
  { no: 36,  name: 'Ya-Sin',      ayat: 83,  arti: 'Ya Sin',           theme: '💫' },
  { no: 55,  name: 'Ar-Rahman',   ayat: 78,  arti: 'Yang Maha Penyayang',theme: '🤲' },
  { no: 56,  name: 'Al-Waqiah',   ayat: 96,  arti: 'Hari Kiamat',      theme: '⭐' },
  { no: 67,  name: 'Al-Mulk',     ayat: 30,  arti: 'Kerajaan',         theme: '🌙' },
  { no: 78,  name: 'An-Naba',     ayat: 40,  arti: 'Berita Besar',     theme: '📜' },
  { no: 112, name: 'Al-Ikhlas',   ayat: 4,   arti: 'Ikhlas',           theme: '🤍' },
  { no: 114, name: 'An-Nas',      ayat: 6,   arti: 'Manusia',          theme: '🌱' },
];

/* ════════════════
   SHOLAT TIMES
   Using Aladhan API (free, no key needed)
════════════════ */
let prayerCache = null;
let prayerCacheDate = null;

async function fetchPrayerTimes(lat, lon) {
  const today = new Date().toLocaleDateString('en-GB');
  if (prayerCache && prayerCacheDate === today) return prayerCache;

  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=20`
    );
    const json = await res.json();
    if (json.code === 200) {
      prayerCache = json.data.timings;
      prayerCacheDate = today;
      localStorage.setItem('moodly_prayer', JSON.stringify({ timings: json.data.timings, date: today, lat, lon }));
      return prayerCache;
    }
  } catch {}
  // Fallback to cached
  try {
    const cached = JSON.parse(localStorage.getItem('moodly_prayer') || 'null');
    if (cached) return cached.timings;
  } catch {}
  return null;
}

/* ════════════════
   QURAN API
   Using alquran.cloud (free)
════════════════ */
async function fetchSurah(no) {
  try {
    const [arRes, idRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${no}`),
      fetch(`https://api.alquran.cloud/v1/surah/${no}/id.indonesian`),
    ]);
    const [arJson, idJson] = await Promise.all([arRes.json(), idRes.json()]);
    if (arJson.code === 200 && idJson.code === 200) {
      return {
        arabic: arJson.data,
        indonesian: idJson.data,
      };
    }
  } catch {}
  return null;
}

/* ════════════════
   DOA LIST
════════════════ */
const DOA_LIST = [
  {
    emoji: '🌅', name: 'Bangun Tidur',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    latin: 'Alhamdulillaahil ladzii ahyaanaa ba\'da maa amaatanaa wa ilaihin nusyuur',
    arti: 'Segala puji bagi Allah yang telah menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dikembalikan.',
    faedah: 'Dibaca sekali setelah bangun tidur',
  },
  {
    emoji: '😴', name: 'Sebelum Tidur',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    latin: 'Bismikallaahumma amuutu wa ahyaa',
    arti: 'Dengan nama-Mu ya Allah, aku mati dan aku hidup.',
    faedah: 'Dibaca ketika berbaring hendak tidur',
  },
  {
    emoji: '😰', name: 'Ketika Gelisah',
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    latin: 'Hasbunallah wa ni\'mal wakiil',
    arti: 'Cukuplah Allah menjadi penolong kami dan Allah adalah sebaik-baik pelindung.',
    faedah: 'Dibaca saat merasa cemas, takut, atau tertekan. Minimal 3x.',
  },
  {
    emoji: '😔', name: 'Ketika Sedih',
    arabic: 'اللَّهُمَّ إِنِّي عَبْدُكَ، ابْنُ عَبْدِكَ، ابْنُ أَمَتِكَ',
    latin: 'Allahumma inni abduka, ibnu abdika, ibnu amatika...',
    arti: 'Ya Allah, sesungguhnya aku adalah hamba-Mu, putra hamba-Mu (laki-laki), putra hamba-Mu (perempuan)...',
    faedah: 'Doa Nabi ﷺ saat sedih (HR. Ahmad). Dibaca dengan penuh perasaan.',
  },
  {
    emoji: '📚', name: 'Sebelum Belajar',
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    latin: 'Rabbi zidnii ilmaa',
    arti: 'Ya Tuhanku, tambahkanlah ilmu kepadaku.',
    faedah: 'QS. Thaha: 114. Dibaca sebelum belajar atau membaca.',
  },
  {
    emoji: '🍽️', name: 'Sebelum Makan',
    arabic: 'بِسْمِ اللَّهِ وَعَلَى بَرَكَةِ اللَّهِ',
    latin: 'Bismillaahi wa \'alaa barakatillaah',
    arti: 'Dengan nama Allah dan atas berkah Allah.',
    faedah: 'HR. Abu Dawud. Jika lupa di awal, tambahkan: Bismillaahi awwalahu wa aakhirahu.',
  },
  {
    emoji: '🚪', name: 'Keluar Rumah',
    arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    latin: 'Bismillaah, tawakkaltu \'alallaah, wa laa hawla wa laa quwwata illaa billaah',
    arti: 'Dengan nama Allah, aku bertawakkal kepada Allah, tiada daya dan kekuatan kecuali dengan pertolongan Allah.',
    faedah: 'HR. Abu Dawud & Tirmidzi. Dibaca saat keluar rumah.',
  },
  {
    emoji: '🙏', name: 'Istighfar',
    arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    latin: 'Astaghfirullaahal \'adziim alladzii laa ilaaha illaa huwal hayyul qayyuumu wa atuubu ilaih',
    arti: 'Aku memohon ampun kepada Allah yang Maha Agung, yang tiada tuhan selain Dia, Yang Maha Hidup lagi terus-menerus mengurus makhluk-Nya, dan aku bertobat kepada-Nya.',
    faedah: 'Istighfar penghapus dosa. Dibaca minimal 3x setiap hari.',
  },
];

/* ════════════════
   MAIN INIT
════════════════ */
export function initSafePlace() {
  renderSafePlace();
}

/* ════════════════
   RENDER SAFE PLACE SCREEN
════════════════ */
function renderSafePlace() {
  const screen = document.getElementById('safeplace');
  if (!screen) return;

  // Get current greeting
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const arabGreeting = h < 12 ? 'صباح الخير' : 'مساء الخير';

  screen.innerHTML = `
    <!-- TOP BAR -->
    <div class="tb" style="flex-direction: column; align-items: flex-start; padding: 20px 16px;">
      <div class="tb-subtitle" style="font-size: 11px; font-weight: 800; color: #8ea095; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px;">
        Rohani & Ketenangan
      </div>
      <div class="tb-main-title" style="font-size: 28px; font-weight: 800; color: #1a5c40; display: flex; align-items: center; gap: 8px; letter-spacing: -0.5px;">
        Safe Place <span style="font-size: 24px;">🕌</span>
      </div>
    </div>

    <div class="sp-hero">
      <div class="sp-arabic">${arabGreeting}</div>
      <div class="sp-greet">${greeting}</div>
      <div class="sp-tagline">Hati yang tenang dimulai dari sini 🤍</div>

      <div class="sp-ayat-box" id="sp-ayat-box">
        <div class="sp-ayat-ar">وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ</div>
        <div class="sp-ayat-id">"Boleh jadi kamu membenci sesuatu, padahal ia amat baik bagimu"</div>
        <div class="sp-ayat-src">QS. Al-Baqarah: 216</div>
      </div>
    </div>

    <!-- HERO ROHANI -->
    <div class="sp-hero">
      <div class="sp-arabic">${arabGreeting}</div>
      <div class="sp-greet">${greeting}</div>
      <div class="sp-tagline">Hati yang tenang dimulai dari sini 🤍</div>

      <!-- Ayat of the Day -->
      <div class="sp-ayat-box" id="sp-ayat-box">
        <div class="sp-ayat-ar">وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ</div>
        <div class="sp-ayat-id">"Boleh jadi kamu membenci sesuatu, padahal ia amat baik bagimu"</div>
        <div class="sp-ayat-src">QS. Al-Baqarah: 216</div>
      </div>
    </div>

    <!-- SECTION: JADWAL SHOLAT -->
    <div class="slbl">🕐 Jadwal Sholat</div>
    <div class="sp-prayer-card" id="sp-prayer-card">
      <div class="sp-prayer-loading">
        <div class="sp-prayer-dots">
          <span></span><span></span><span></span>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:8px">Mendeteksi lokasi...</div>
      </div>
    </div>

    <!-- SECTION: AL-QURAN -->
    <div class="slbl">📖 Al-Quran</div>
    <div class="sp-quran-card">
      <div class="sp-quran-header">
        <div>
          <div class="sp-quran-title">Baca Al-Quran</div>
          <div class="sp-quran-sub">Pilih surah untuk mulai membaca</div>
        </div>
        <div class="sp-quran-badge">10 Surah</div>
      </div>
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

    <!-- SECTION: KAJIAN -->
    <div class="slbl">💡 Kajian Islami</div>
    <div class="sp-kajian-list">
      ${KAJIAN_LIST.map(k => `
        <div class="sp-kajian-card" onclick="window._openKajian('${k.id}')">
          <div class="sp-kajian-top">
            <span class="sp-kajian-em">${k.emoji}</span>
            <div class="sp-kajian-meta">
              <div class="sp-kajian-cat">${k.category}</div>
              <div class="sp-kajian-title">${k.title}</div>
            </div>
            <div class="sp-kajian-time">${k.readTime}</div>
          </div>
          <div class="sp-kajian-src">📚 ${k.source}</div>
        </div>
      `).join('')}
    </div>

    <!-- SECTION: DOA HARIAN -->
    <div class="slbl">🤲 Doa Harian</div>
    <div class="sp-doa-grid">
      ${DOA_LIST.map((d,i) => `
        <button class="sp-doa-btn" onclick="window._showDoa(${i})">
          <span>${d.emoji}</span>
          <span>${d.name}</span>
        </button>
      `).join('')}
    </div>

    <!-- Spacer -->
    <div style="height:8px"></div>
  `;

  // Load prayer times
  loadAndRenderPrayer();
}

/* ════════════════
   PRAYER TIMES
════════════════ */
async function loadAndRenderPrayer() {
  const card = document.getElementById('sp-prayer-card');
  if (!card) return;

  let lat, lon, cityName = 'Lokasi kamu';

  // Try cache first
  try {
    const cached = JSON.parse(localStorage.getItem('moodly_prayer') || 'null');
    if (cached && cached.timings) {
      lat = cached.lat; lon = cached.lon;
      renderPrayerTimes(cached.timings, cityName);
    }
  } catch {}

  // Get geolocation
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;

        // Reverse geocode for city name (optional)
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const geoJson = await geoRes.json();
          cityName = geoJson.address?.city || geoJson.address?.county || geoJson.address?.state || 'Lokasi kamu';
        } catch {}

        const timings = await fetchPrayerTimes(lat, lon);
        if (timings) renderPrayerTimes(timings, cityName);
      },
      () => {
        // Denied: use default WIB (Jakarta)
        fetchPrayerTimes(-6.2088, 106.8456).then(t => {
          if (t) renderPrayerTimes(t, 'Jakarta (default)');
          else renderPrayerError();
        });
      }
    );
  } else {
    renderPrayerError();
  }
}

const PRAYER_NAMES = {
  Fajr: { label: 'Subuh', emoji: '🌅' },
  Dhuhr: { label: 'Dzuhur', emoji: '☀️' },
  Asr: { label: 'Ashar', emoji: '🌤️' },
  Maghrib: { label: 'Maghrib', emoji: '🌇' },
  Isha: { label: 'Isya', emoji: '🌙' },
};

function renderPrayerTimes(timings, cityName) {
  const card = document.getElementById('sp-prayer-card');
  if (!card) return;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function timeToMinutes(str) {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  }

  // Find next prayer
  const prayers = Object.entries(PRAYER_NAMES).map(([key, info]) => ({
    key,
    ...info,
    time: timings[key],
    minutes: timeToMinutes(timings[key]),
  }));

  const nextPrayer = prayers.find(p => p.minutes > nowMinutes) || prayers[0];
  const minutesLeft = nextPrayer.minutes - nowMinutes;
  const hoursLeft = Math.floor(minutesLeft / 60);
  const minsLeft  = minutesLeft % 60;
  const countdownStr = minutesLeft > 0
    ? (hoursLeft > 0 ? `${hoursLeft}j ${minsLeft}m lagi` : `${minsLeft} menit lagi`)
    : 'Sekarang!';

  card.innerHTML = `
    <div class="sp-prayer-city">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="2"/></svg>
      ${cityName}
    </div>

    <!-- Next prayer highlight -->
    <div class="sp-next-prayer">
      <div>
        <div class="sp-next-label">Sholat Berikutnya</div>
        <div class="sp-next-name">${nextPrayer.emoji} ${nextPrayer.label}</div>
        <div class="sp-next-time">${nextPrayer.time} WIB</div>
      </div>
      <div class="sp-next-countdown">${countdownStr}</div>
    </div>

    <!-- All prayers -->
    <div class="sp-prayer-row">
      ${prayers.map(p => {
        const isPast = p.minutes < nowMinutes;
        const isNext = p.key === nextPrayer.key;
        return `<div class="sp-prayer-item ${isNext ? 'sp-prayer-next' : ''} ${isPast ? 'sp-prayer-past' : ''}">
          <span class="sp-pi-em">${p.emoji}</span>
          <div class="sp-pi-name">${p.label}</div>
          <div class="sp-pi-time">${p.time}</div>
          ${isPast ? '<div class="sp-pi-done">✓</div>' : ''}
        </div>`;
      }).join('')}
    </div>
  `;
}

function renderPrayerError() {
  const card = document.getElementById('sp-prayer-card');
  if (!card) return;
  card.innerHTML = `
    <div style="padding:16px;text-align:center;">
      <div style="font-size:24px;margin-bottom:8px">📍</div>
      <div style="font-size:13px;color:var(--text);font-weight:600;margin-bottom:4px">Lokasi tidak bisa diakses</div>
      <div style="font-size:12px;color:var(--muted)">Aktifkan izin lokasi di browser untuk melihat jadwal sholat akurat</div>
      <button onclick="window._retryPrayer()" style="margin-top:10px;padding:7px 14px;border-radius:100px;background:var(--gl);border:1.5px solid var(--border);font-size:12px;font-weight:600;color:var(--g2);cursor:pointer;font-family:inherit">Coba Lagi</button>
    </div>`;
}

window._retryPrayer = loadAndRenderPrayer;

/* ════════════════
   SURAH READER
════════════════ */
export async function openSurah(no) {
  const modal = document.getElementById('surah-modal');
  if (!modal) return;

  const surahInfo = FEATURED_SURAHS.find(s => s.no === no);
  modal.classList.add('show');

  document.getElementById('surah-modal-title').textContent = surahInfo?.name || 'Memuat...';
  document.getElementById('surah-modal-content').innerHTML = `
    <div style="text-align:center;padding:32px;color:var(--muted)">
      <div style="font-size:24px;margin-bottom:8px">📖</div>
      <div>Memuat surah...</div>
    </div>`;

  const data = await fetchSurah(no);
  if (!data) {
    document.getElementById('surah-modal-content').innerHTML = `
      <div style="padding:20px;text-align:center;color:var(--muted)">
        Gagal memuat. Cek koneksi internet kamu.
      </div>`;
    return;
  }

  const { arabic, indonesian } = data;
  const ayahs = arabic.ayahs;
  const translations = indonesian.ayahs;

  document.getElementById('surah-modal-title').textContent = `${surahInfo?.theme || '📖'} ${arabic.name} — ${arabic.englishName}`;

  document.getElementById('surah-modal-content').innerHTML = `
    <div class="surah-meta-row">
      <span class="surah-meta-badge">${arabic.revelationType === 'Meccan' ? '🕋 Makkiyah' : '🕌 Madaniyah'}</span>
      <span class="surah-meta-badge">${arabic.numberOfAyahs} Ayat</span>
      <span class="surah-meta-badge">${arabic.englishNameTranslation}</span>
    </div>
    ${no !== 9 ? `<div class="surah-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>` : ''}
    ${ayahs.map((a, i) => `
      <div class="surah-ayah">
        <div class="surah-ar">${a.text} <span class="surah-num">﴿${a.numberInSurah}﴾</span></div>
        <div class="surah-id">${translations[i]?.text || ''}</div>
      </div>
    `).join('')}
  `;
}

window._openSurah   = openSurah;
window._closeSurah  = () => document.getElementById('surah-modal')?.classList.remove('show');

/* ════════════════
   KAJIAN READER
════════════════ */
export function openKajian(id) {
  const kajian = KAJIAN_LIST.find(k => k.id === id);
  if (!kajian) return;

  const modal = document.getElementById('kajian-modal');
  if (!modal) return;

  document.getElementById('kajian-modal-emoji').textContent   = kajian.emoji;
  document.getElementById('kajian-modal-cat').textContent     = kajian.category;
  document.getElementById('kajian-modal-title').textContent   = kajian.title;
  document.getElementById('kajian-modal-src').textContent     = kajian.source;
  document.getElementById('kajian-modal-time').textContent    = kajian.readTime;

  // Render content with formatting
  const contentEl = document.getElementById('kajian-modal-content');
  contentEl.innerHTML = kajian.content
    .split('\n')
    .map(line => {
      if (line.startsWith('→')) return `<div class="kjm-arrow">${line}</div>`;
      if (line.startsWith('📿')) return `<div class="kjm-dzikir">${line}</div>`;
      if (line.startsWith('✦')) return `<div class="kjm-tip">${line}</div>`;
      if (line.match(/^\d\./)) return `<div class="kjm-num">${line}</div>`;
      if (line.startsWith('"') || line.startsWith('"')) return `<div class="kjm-quote">${line}</div>`;
      if (!line.trim()) return '<div style="height:8px"></div>';
      return `<p class="kjm-p">${line}</p>`;
    })
    .join('');

  modal.classList.add('show');
}

window._openKajian  = openKajian;
window._closeKajian = () => document.getElementById('kajian-modal')?.classList.remove('show');


export function showDoa(idx) {
  const doa   = DOA_LIST[idx];
  const modal = document.getElementById('doa-modal');
  if (!modal || !doa) return;

  document.getElementById('doa-modal-emoji').textContent  = doa.emoji;
  document.getElementById('doa-modal-name').textContent   = doa.name;
  document.getElementById('doa-modal-ar').textContent     = doa.arabic;
  document.getElementById('doa-modal-lat').textContent    = doa.latin;
  document.getElementById('doa-modal-arti').textContent   = doa.arti;
  document.getElementById('doa-modal-faedah').textContent = doa.faedah;
  modal.classList.add('show');
}

window._showDoa  = showDoa;
window._closeDoa = () => document.getElementById('doa-modal')?.classList.remove('show');