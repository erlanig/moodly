/* ═══════════════════════════════════════
   MOODLY — news.js
   AI-powered article fetching + rendering
   ═══════════════════════════════════════ */

import { loadNewsCache, saveNewsCache } from './firebase.js';

/* ════════════════
   STATE
════════════════ */
export let artStore = [];
let curFilter = 'semua';

/* ════════════════
   TOPIC ROTATION
════════════════ */
const TOPICS = [
  ['meningkatkan mood pagi hari alami','teknik grounding kecemasan panik','sleep hygiene tidur berkualitas','self-care realistis sehari-hari','bangkit setelah hari berat','makanan pengaruhi mood'],
  ['journaling manfaat kesehatan mental','olahraga dan kesehatan jiwa','mengelola stres pekerjaan','dopamin kebiasaan positif','meditasi mindfulness pemula','hubungan sosial kebahagiaan'],
  ['mengatasi overthinking cara efektif','sindrom impostor cara mengatasinya','screen time kesehatan mental','gratitude dan kebahagiaan ilmiah','burnout tanda dan cara pulih','kecemasan sosial tips'],
  ['self-compassion pentingnya','cara menenangkan diri saat panik','kebiasaan pagi mood positif','digital detox manfaat mental','nutrisi otak dan emosi','melepaskan perfeksionisme'],
  ['terapi CBT manfaat cara kerja','mindful eating hubungan makanan','inner child healing pengantar','afirmasi positif cara kerja','peer support kesehatan mental','rutinitas malam tidur berkualitas'],
  ['batas sehat dalam hubungan','cara kerja hormon stres kortisol','manfaat alam untuk kesehatan jiwa','emotional regulation teknik dasar','mengatasi kesepian di kota besar','produktivitas tanpa burnout'],
  ['pola pikir growth mindset','cara kerja anxiety di otak','kekuatan bercerita untuk healing','istirahat aktif vs pasif','regulasi emosi anak muda','self-esteem membangunnya kembali'],
];
const CATMAP = ['mood','stres','tidur','self-care','motivasi','mood','stres'];

/* ════════════════
   DATE HELPERS
════════════════ */
function todayKey() {
  const d = new Date();
  // Format YYYY-MM-DD konsisten agar tidak berubah karena timezone edge-case
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function todayLabel() {
  return new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' });
}
/** Hash tanggal → topic index yang berbeda setiap hari */
function getTopicIndex() {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  return seed % TOPICS.length;
}

/* ════════════════
   INIT
════════════════ */
export async function initNews() {
  document.getElementById('date-pill').innerHTML = `
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#0a9e3f" stroke-width="2"/><path d="M3 10h18M8 2v4M16 2v4" stroke="#0a9e3f" stroke-width="2"/></svg>
    ${todayLabel()}`;

  const key = todayKey();
  const cached = await loadNewsCache();

  // Validasi cache: harus punya key hari ini DAN disimpan setelah tengah malam hari ini
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  let savedAt = null;
  if (cached?.savedAt) {
    // Firestore Timestamp object vs plain ISO string
    savedAt = cached.savedAt.toDate ? cached.savedAt.toDate() : new Date(cached.savedAt);
  }
  const cacheValid = cached && cached.key === key && cached.arts?.length >= 1 && savedAt && savedAt >= midnight;

  if (cacheValid) {
    artStore = cached.arts;
    renderNews(artStore, curFilter);
    buildHomePreview();
  } else {
    await loadArticles();
  }
}

/* ════════════════
   FETCH ARTICLES
════════════════ */
async function loadArticles() {
  document.getElementById('news-wrap').innerHTML = `
    <div class="ldwrap">
      <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
      <div class="ld-txt">Menyiapkan artikel hari ini…</div>
    </div>`;

  const today = new Date();
  const topics = TOPICS[getTopicIndex()];
  const cats   = topics.map((_,i) => CATMAP[i] || 'mood');

  const prompt = `Kamu penulis kesehatan mental Indonesia yang hangat dan berbasis bukti ilmiah.
Tanggal hari ini: ${today.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}.
Tulis tepat 6 artikel lengkap dan unik. Topik (sesuai urutan, satu artikel per topik):
${topics.map((t,i) => `${i+1}. ${t}`).join('\n')}

Kembalikan HANYA JSON array valid, tanpa markdown, tanpa teks di luar JSON:
[{"id":1,"cat":"${cats[0]}","emoji":"<emoji>","source":"<Halodoc|Alodokter|Klikdokter|SehatQ|Kompas Health|Hellosehat|Riliv Blog>","title":"<max 12 kata>","preview":"<2 kalimat menarik>","tags":["<tag1>","<tag2>","<tag3>"],"readTime":"<X menit>","content":"<HTML artikel min 450 kata: pakai p h3 blockquote ul li strong, bahasa hangat relatable, ada tips praktis, akhiri dengan motivasi>"},...]
Kategori tiap artikel: ${cats.join(', ')}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const raw  = data.content.map(c => c.text || '').join('');
    const arts = JSON.parse(raw.replace(/```json|```/g,'').trim());
    artStore = arts;
    await saveNewsCache(todayKey(), arts);
    renderNews(arts, curFilter);
    buildHomePreview();
  } catch (e) {
    console.warn('[news] fetch failed, using fallback', e.message);
    artStore = fallbackArticles();
    await saveNewsCache(todayKey(), artStore);
    renderNews(artStore, curFilter);
    buildHomePreview();
  }
}

export async function forceRefresh() {
  const ic = document.getElementById('rf-ic');
  ic.style.transition = 'transform .45s';
  ic.style.transform  = 'rotate(360deg)';
  setTimeout(() => { ic.style.transition=''; ic.style.transform=''; }, 460);
  await saveNewsCache('', []);
  artStore = [];
  await loadArticles();
}

/* ════════════════
   FILTER
════════════════ */
export function filterNews(cat, btn) {
  curFilter = cat;
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  if (artStore.length) renderNews(artStore, cat);
}

/* ════════════════
   RENDER LIST
════════════════ */
export function renderNews(arts, filter) {
  const list = filter === 'semua' ? arts : arts.filter(a => a.cat === filter);
  const wrap = document.getElementById('news-wrap');
  if (!list.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:14px">Tidak ada artikel untuk kategori ini.</div>`;
    return;
  }
  wrap.innerHTML = `<div class="nlist">${list.map(a => {
    const idx = artStore.indexOf(a);
    return `<div class="ncard" onclick="window._openArt(${idx})">
      <div class="ncard-top">
        <div class="ncard-thumb">${a.emoji}</div>
        <div class="ncard-body">
          <div class="ncard-src-row"><div class="ncard-dot"></div><div class="ncard-src">${a.source}</div></div>
          <div class="ncard-title">${a.title}</div>
          <div class="ncard-snip">${a.preview}</div>
        </div>
      </div>
      <div class="ncard-bot">
        <div class="ncard-read">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="#1db954" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Baca · ${a.readTime}
        </div>
        <div class="ncard-tags">${(a.tags||[]).slice(0,2).map(t => `<span class="ntag">${t}</span>`).join('')}</div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

/* ════════════════
   HOME PREVIEW
════════════════ */
export function buildHomePreview() {
  const el = document.getElementById('home-prev');
  if (!el) return;
  if (!artStore.length) {
    el.innerHTML = `<div class="prev-card" onclick="window._showScreen('news')">
      <div class="prev-em">📰</div>
      <div><div class="prev-src">Artikel Harian</div><div class="prev-title">Tips kesehatan mental berganti tiap hari →</div></div>
    </div>`;
    return;
  }
  el.innerHTML = artStore.slice(0, 2).map((a, i) => `
    <div class="prev-card" onclick="window._openArt(${i})" style="margin-bottom:7px">
      <div class="prev-em">${a.emoji}</div>
      <div>
        <div class="prev-src">${a.source}</div>
        <div class="prev-title">${a.title}</div>
      </div>
    </div>`).join('');
}

/* ════════════════
   ARTICLE OVERLAY
════════════════ */
export function openArt(idx) {
  const a = artStore[idx]; if (!a) return;
  document.getElementById('art-tb-src').textContent = a.source;
  document.getElementById('art-tb-ttl').textContent = a.title;
  const cats = { mood:'Mood & Emosi', stres:'Stres & Kecemasan', tidur:'Kualitas Tidur', 'self-care':'Self-Care', motivasi:'Motivasi & Resiliensi' };
  const dateStr = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById('art-body').innerHTML = `
    <div class="art-cat">${cats[a.cat] || 'Kesehatan Mental'}</div>
    <div class="art-title">${a.title}</div>
    <div class="art-meta">
      <span class="art-src">${a.source}</span>
      <span class="art-date">📅 ${dateStr}</span>
      <span class="art-rt">⏱ ${a.readTime}</span>
    </div>
    <div class="art-hero">${a.emoji}</div>
    <div class="art-content">${a.content}</div>
    <div class="art-tags">${(a.tags||[]).map(t => `<span class="art-tag">${t}</span>`).join('')}</div>
  `;
  const ov = document.getElementById('art-ov');
  const sc = document.querySelector('.art-scroll');
  ov.style.display = 'flex'; sc.scrollTop = 0;
  ov.getBoundingClientRect();
  ov.classList.add('open');
  history.pushState({ art: true }, '');
}

export function closeArt() {
  const ov = document.getElementById('art-ov');
  ov.classList.remove('open');
  setTimeout(() => ov.style.display = '', 320);
}

/* ════════════════
   FALLBACK
════════════════ */
function fallbackArticles() {
  return [
    {id:1,cat:'mood',emoji:'😊',source:'Halodoc',title:'5 Cara Alami Boost Mood di Pagi Hari',preview:'Pagi hari menentukan tone suasana hatimu seharian. Kenali cara sederhana yang terbukti efektif.',tags:['mood','pagi hari','tips'],readTime:'4 menit',content:'<p>Pernah bangun pagi tapi mood udah di lantai duluan? Kamu nggak sendirian. Suasana hati pagi dipengaruhi banyak faktor — kualitas tidur, apa yang kamu lakukan pertama kali, dan paparan cahaya.</p><h3>1. Buka Tirai, Sambut Sinar Matahari</h3><p>Paparan sinar matahari adalah sinyal alami bagi otak untuk memproduksi <strong>serotonin</strong>. Hanya 10–15 menit sudah cukup mengubah mood pagi hari.</p><blockquote>Penelitian dari Journal of Affective Disorders membuktikan terapi cahaya meningkatkan mood secara konsisten.</blockquote><h3>2. Tunda Buka HP 20 Menit</h3><p>Gunakan 20 menit pertama untuk stretching, minum air putih, atau menulis 3 hal syukur.</p><h3>3. Sarapan Bergizi</h3><p>Sarapan tinggi protein dan serat kompleks menstabilkan gula darah dan mood sepanjang hari.</p><h3>4. Gerakan Ringan</h3><p>Jalan kaki 10 menit memicu pelepasan <strong>endorfin</strong> alami.</p><h3>5. Satu Niat Harian</h3><p>Tetapkan satu hal yang ingin kamu selesaikan hari ini. Mulai kecil, tapi mulai hari ini. 💚</p>'},
    {id:2,cat:'stres',emoji:'😰',source:'Alodokter',title:'Teknik 5-4-3-2-1 Grounding untuk Redakan Panik',preview:'Kecemasan mendadak bisa diredakan dalam 5 menit dengan teknik grounding sederhana ini.',tags:['kecemasan','grounding','panik'],readTime:'5 menit',content:'<p>Serangan kecemasan bisa datang kapan saja. Teknik <strong>5-4-3-2-1 Grounding</strong> mengalihkan fokus dari pikiran berputar ke pengalaman inderawi saat ini.</p><h3>Cara Melakukannya</h3><ul><li><strong>5 hal yang bisa kamu LIHAT</strong> — perhatikan detail di sekitarmu</li><li><strong>4 hal yang bisa kamu RASAKAN</strong> — kursi, tekstur baju, suhu udara</li><li><strong>3 hal yang bisa kamu DENGAR</strong></li><li><strong>2 hal yang bisa kamu CIUM</strong></li><li><strong>1 hal yang bisa kamu RASAKAN di mulut</strong></li></ul><blockquote>Grounding bukan tentang menghilangkan kecemasan — ini tentang membantumu melewatinya dengan lebih sadar.</blockquote><p>Latih saat tenang agar saat cemas kamu sudah otomatis. Kamu bisa melewati ini. 💙</p>'},
    {id:3,cat:'tidur',emoji:'😴',source:'Klikdokter',title:'Kenapa 7–9 Jam Tidur Bisa Mengubah Segalanya',preview:'Kurang tidur bukan hanya soal ngantuk. Ada alasan neurologis mengapa tidur berkualitas adalah fondasi kesehatan mental.',tags:['tidur','sleep hygiene','otak'],readTime:'5 menit',content:'<p>Selama tidur, otak membersihkan limbah metabolik, mengkonsolidasi memori emosional, dan meregulasi hormon stres.</p><blockquote>Satu malam kurang tidur meningkatkan reaktivitas amigdala hingga 60%. — Matthew Walker</blockquote><h3>Sleep Hygiene yang Benar-Benar Bekerja</h3><ul><li><strong>Konsistensi waktu</strong> — tidur dan bangun di jam yang sama</li><li><strong>Stop layar 60 menit sebelum tidur</strong></li><li><strong>Suhu kamar 18–20°C</strong></li><li><strong>Rutinitas winding down</strong></li></ul><p>Investasi konsisten dalam sleep hygiene adalah salah satu hal terbaik untuk kesehatan mentalmu. 🌙</p>'},
    {id:4,cat:'self-care',emoji:'🛁',source:'SehatQ',title:'Self-Care Realistis untuk Kamu yang Sibuk',preview:'Self-care sejati bukan spa mahal. Ini tentang kebiasaan kecil yang kamu lakukan secara konsisten.',tags:['self-care','kebiasaan','well-being'],readTime:'5 menit',content:'<p>Self-care adalah tindakan <strong>sadar</strong> dan <strong>konsisten</strong> untuk memelihara kesehatan fisik, emosional, dan mental — bukan kemewahan sesekali.</p><h3>Micro Self-Care: 5 Menit yang Mengubah Hari</h3><ul><li><strong>Hidrasi sadar</strong> — minum air sambil benar-benar merasakannya</li><li><strong>Pause 2 menit</strong> di antara task</li><li><strong>Stretching micro</strong> setiap jam</li><li><strong>Check-in internal</strong> — aku butuh apa sekarang?</li></ul><blockquote>Kamu tidak bisa menuangkan dari gelas yang kosong.</blockquote><p>Mulai dengan SATU kebiasaan self-care minggu ini. Kamu layak mendapat perhatian itu. 🌱</p>'},
    {id:5,cat:'motivasi',emoji:'💪',source:'Hellosehat',title:'Cara Bangkit Setelah Hari Paling Berat',preview:'Ada perbedaan besar antara move on paksa dan benar-benar pulih. Ini cara yang lebih sehat.',tags:['resiliensi','self-compassion','bangkit'],readTime:'5 menit',content:'<p>Menolak atau menekan emosi negatif justru membuat kita makin stuck. <strong>Emosi bukan musuh — melainkan informasi yang perlu didengar.</strong></p><h3>Langkah 1: Izinkan Dirimu Merasa</h3><p>Hari ini berat. Itu nyata. Mengakuinya bukan tanda kelemahan.</p><h3>Langkah 2: Dekompresi Dulu</h3><ul><li>Jalan kaki tanpa earphone</li><li>Tulis semua yang bikin frustrasi</li><li>Hubungi satu orang yang kamu percaya</li></ul><blockquote>Resiliensi bukan tentang tidak pernah jatuh. Ini tentang cara kita bangkit.</blockquote><p>Besok adalah halaman baru. Dan kamu sudah selamat hari ini. Itu cukup. 💚</p>'},
    {id:6,cat:'mood',emoji:'🥗',source:'Riliv Blog',title:'Makanan yang Diam-Diam Mengontrol Mood Kamu',preview:'Gut-brain connection bukan mitos. Apa yang kamu makan langsung berdampak pada perasaanmu.',tags:['nutrisi','gut-brain','mood'],readTime:'5 menit',content:'<p>Sekitar <strong>90–95% serotonin</strong> diproduksi di usus, bukan di otak.</p><h3>Makanan yang Mendukung Mood Positif</h3><ul><li><strong>Ikan berlemak</strong> — Omega-3 mengurangi peradangan otak</li><li><strong>Fermentasi (tempe, yogurt)</strong> — probiotik menjaga mikrobioma</li><li><strong>Dark chocolate 70%+</strong> — memicu endorfin</li><li><strong>Pisang</strong> — mengandung tryptophan, prekursor serotonin</li></ul><blockquote>Tambahkan satu makanan baik per minggu daripada mengeliminasi semua sekaligus.</blockquote><p>Jadikan makanan sebagai salah satu cara merawat dirimu. 🌿</p>'},
  ];
}