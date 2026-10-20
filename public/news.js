/* ═══════════════════════════════════════
   MOODLY — news.js
   AI-powered article fetching + rendering
   Refresh: setiap 6 jam | 10 artikel/sesi
   ═══════════════════════════════════════ */

import { loadNewsCache, saveNewsCache } from './firebase.js';

/* ════════════════
   STATE
════════════════ */
export let artStore = [];
let curFilter = 'semua';

/* ════════════════
   BOOKMARKS
════════════════ */
export function getBookmarks() {
  try { return JSON.parse(localStorage.getItem('moodly_bookmarks') || '[]'); }
  catch { return []; }
}

export function toggleBookmark(idx) {
  const a = artStore[idx];
  if (!a) return;
  let bms = getBookmarks();
  const exists = bms.some(b => b.title === a.title);
  if (exists) {
    bms = bms.filter(b => b.title !== a.title);
    if (window._moodlyToast) window._moodlyToast('Bookmark dihapus');
  } else {
    bms.unshift(a);
    if (window._moodlyToast) window._moodlyToast('Disimpan ke Bookmark');
  }
  localStorage.setItem('moodly_bookmarks', JSON.stringify(bms));
  updateBookmarkButton(idx);
  if (curFilter === 'bookmark') {
    renderNews(bms, 'bookmark');
  }
}
window._toggleBookmark = toggleBookmark;

function updateBookmarkButton(idx) {
  const btn = document.getElementById('art-bm-btn');
  if (!btn) return;
  const a = artStore[idx];
  const bms = getBookmarks();
  const isBm = a && bms.some(b => b.title === a.title);
  btn.innerHTML = isBm ? '★' : '☆';
  btn.title = isBm ? 'Hapus bookmark' : 'Simpan bookmark';
}

/* ════════════════
   TOPIC ROTATION
════════════════ */
const TOPICS = [
  ['meningkatkan mood pagi hari alami','teknik grounding kecemasan panik','sleep hygiene tidur berkualitas','self-care realistis sehari-hari','bangkit setelah hari berat','makanan pengaruhi mood','journaling manfaat mental','olahraga dan kesehatan jiwa','mengelola stres kerja','dopamin kebiasaan positif'],
  ['mengatasi overthinking efektif','sindrom impostor cara atasi','screen time kesehatan mental','gratitude dan kebahagiaan','burnout tanda dan pulih','kecemasan sosial tips','self-compassion pentingnya','cara tenang saat panik','kebiasaan pagi positif','digital detox manfaat'],
  ['terapi CBT manfaat cara kerja','mindful eating hubungan makanan','inner child healing pengantar','afirmasi positif cara kerja','peer support kesehatan mental','rutinitas malam tidur berkualitas','batas sehat dalam hubungan','cara kerja hormon stres','manfaat alam untuk jiwa','emotional regulation dasar'],
  ['pola pikir growth mindset','cara kerja anxiety di otak','sabar dan resiliensi psikologi islami','istirahat aktif vs pasif','regulasi emosi anak muda','self-esteem membangun kembali','nutrisi otak dan emosi','melepaskan perfeksionisme','mengatasi kesepian kota besar','produktivitas tanpa burnout'],
  ['hubungan toxic cara kenali','cara minta bantuan psikolog','musik dan kesehatan mental','tertawa manfaat psikologis','kreativitas sebagai healing','menulis diary manfaat ilmiah','meditasi body scan panduan','napas dalam teknik efektif','alam dan stress reduction','sleep debt cara bayar'],
  ['attachment style hubungan','cara kerja trauma di otak','mindfulness untuk pemula','tawakkal dan kesehatan mental','polyvagal theory sederhana','window of tolerance explained','co-regulation dengan orang lain','neuroception dan rasa aman','interoception latihan kesadaran','vagus nerve stimulasi alami']
];

const CATMAP = [
  'mood','stres','tidur','self-care','motivasi','islam','stres','tidur','self-care','motivasi',
];

/* ════════════════
   DATE / TIME HELPERS (Daily key)
════════════════ */
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function todayLabel() {
  return new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

function getTopicIndex() {
  const key = todayKey();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash % TOPICS.length;
}

/* ════════════════
   INIT
════════════════ */
export async function initNews() {
  const datePill = document.getElementById('date-pill');
  if (datePill) {
    datePill.innerHTML = `
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#ff2d55" stroke-width="2"/><path d="M3 10h18M8 2v4M16 2v4" stroke="#ff2d55" stroke-width="2"/></svg>
      ${todayLabel()} · Edisi Hari Ini`;
  }

  const currentKey = todayKey();
  const cached     = await loadNewsCache();

  const cacheValid = cached && cached.key === currentKey && Array.isArray(cached.arts) && cached.arts.length >= 1;

  if (cacheValid) {
    artStore = cached.arts;
    renderNews(artStore, curFilter);
    buildHomePreview();
  } else {
    await loadArticles();
  }
}

function slotLabel() {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return 'Pagi';
  if (h >= 11 && h < 15) return 'Siang';
  if (h >= 15 && h < 18) return 'Sore';
  return 'Malam';
}

export function getCatIcon(cat) {
  switch(cat) {
    case 'mood':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`;
    case 'stres':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
    case 'tidur':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5856d6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
    case 'self-care':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff9500" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
    case 'motivasi':
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34c759" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
    default:
      return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>`;
  }
}

/* ════════════════
   FETCH ARTICLES
════════════════ */
async function loadArticles() {
  const wrap = document.getElementById('news-wrap');
  if (wrap) {
    wrap.innerHTML = `
      <div class="ldwrap">
        <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        <div class="ld-txt">Menyiapkan kurasi 10 artikel ${slotLabel().toLowerCase()} ini…</div>
      </div>`;
  }

  const today  = new Date();
  const topics = TOPICS[getTopicIndex()];
  const cats   = topics.map((_,i) => CATMAP[i % CATMAP.length]);

  const prompt = `Kamu penulis kesehatan mental Indonesia yang hangat dan berbasis bukti ilmiah.
Tanggal hari ini: ${today.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}.

Tulis tepat 10 artikel lengkap dan unik. Topik (satu artikel per topik, urutan sama):
${topics.map((t,i) => `${i+1}. ${t}`).join('\n')}

Kembalikan HANYA JSON array valid, tanpa markdown, tanpa teks di luar JSON:
[{"id":1,"cat":"${cats[0]}","source":"<Halodoc|Alodokter|Klikdokter|SehatQ|Kompas Health|Hellosehat|Riliv Blog|Into The Light|Yayasan Pulih>","title":"<judul max 12 kata>","preview":"<2 kalimat menarik>","tags":["<tag1>","<tag2>","<tag3>"],"readTime":"<X menit>","content":"<HTML artikel min 400 kata: pakai p h3 blockquote ul li strong, bahasa hangat relatable, tips praktis, motivasi>"},...]`;

  try {
    const res = await fetch('/api/anthropic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) throw new Error('API unavailable: ' + res.status);
    const data = await res.json();
    const raw = (data.content || [])
      .filter(c => c.type === 'text')
      .map(c => c.text || '')
      .join('');

    const arts = JSON.parse(raw.replace(/```json|```/g,'').trim());
    if (!Array.isArray(arts) || !arts.length) throw new Error('Format invalid');
    artStore = arts;
    await saveNewsCache(todayKey(), arts);
    renderNews(arts, curFilter);
    buildHomePreview();
  } catch (e) {
    console.warn('[news] Menggunakan artikel kurasi:', e.message);
    artStore = fallbackArticles();
    await saveNewsCache(todayKey(), artStore);
    renderNews(artStore, curFilter);
    buildHomePreview();
  }
}

export async function forceRefresh() {
  const ic = document.getElementById('rf-ic');
  if (ic) {
    ic.style.transition = 'transform .45s';
    ic.style.transform  = 'rotate(360deg)';
    setTimeout(() => { ic.style.transition=''; ic.style.transform=''; }, 460);
  }
  await saveNewsCache('__invalidated__', []);
  artStore = [];
  await loadArticles();
}

/* ════════════════
   FILTER
════════════════ */
export function filterNews(cat, btn) {
  curFilter = cat;
  document.querySelectorAll('.ftab').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  if (cat === 'bookmark') {
    renderNews(getBookmarks(), 'bookmark');
  } else if (artStore.length) {
    renderNews(artStore, cat);
  }
}

/* ════════════════
   RENDER LIST
════════════════ */
export function renderNews(arts, filter) {
  const list = (filter === 'semua' || !filter)
    ? arts
    : (filter === 'bookmark' ? arts : arts.filter(a => a.cat === filter));
  const wrap = document.getElementById('news-wrap');
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:14px">${filter === 'bookmark' ? 'Belum ada artikel yang kamu bookmark. Klik ⭐ di artikel untuk menyimpannya!' : 'Tidak ada artikel untuk kategori ini.'}</div>`;
    return;
  }
  const bms = getBookmarks();
  wrap.innerHTML = `<div class="nlist">${list.map(a => {
    const idx = artStore.findIndex(item => item.title === a.title);
    const isBookmarked = bms.some(b => b.title === a.title);
    return `<div class="ncard card-enter" onclick="window._openArt(${idx >= 0 ? idx : 0})">
      <div class="ncard-top">
        <div class="ncard-thumb" style="display:flex;align-items:center;justify-content:center;background:#fff5f7;border-radius:12px;width:40px;height:40px;border:1px solid rgba(255,45,85,0.12)">${getCatIcon(a.cat)}</div>
        <div class="ncard-body">
          <div class="ncard-src-row">
            <div class="ncard-dot"></div>
            <div class="ncard-src">${a.source}</div>
            <span class="nbadge-new">Baru hari ini</span>
            ${isBookmarked ? '<span style="margin-left:auto;font-size:12px;color:#ff9500">★</span>' : ''}
          </div>
          <div class="ncard-title">${a.title}</div>
          <div class="ncard-snip">${a.preview}</div>
        </div>
      </div>
      <div class="ncard-bot">
        <div class="ncard-read">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="var(--p1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
      <div class="prev-em" style="display:flex;align-items:center;justify-content:center;background:#fff5f7;border-radius:10px;width:34px;height:34px;border:1px solid rgba(255,45,85,0.12)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
      </div>
      <div><div class="prev-src">Artikel Harian</div><div class="prev-title">10 tips kesehatan mental update setiap hari →</div></div>
    </div>`;
    return;
  }
  el.innerHTML = artStore.slice(0, 2).map((a, i) => `
    <div class="prev-card" onclick="window._openArt(${i})" style="margin-bottom:7px">
      <div class="prev-em" style="display:flex;align-items:center;justify-content:center;background:#fff5f7;border-radius:10px;width:34px;height:34px;border:1px solid rgba(255,45,85,0.12)">
        ${getCatIcon(a.cat)}
      </div>
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
  const cats = {
    mood:'Mood & Emosi',
    stres:'Stres & Kecemasan',
    tidur:'Kualitas Tidur',
    'self-care':'Self-Care',
    motivasi:'Motivasi & Resiliensi',
    islam:'Islam & Psikologi'
  };
  const dateStr = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const bms = getBookmarks();
  const isBm = bms.some(b => b.title === a.title);

  document.getElementById('art-body').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div class="art-cat">${cats[a.cat] || 'Kesehatan Mental'}</div>
      <button id="art-bm-btn" onclick="window._toggleBookmark(${idx})" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--p1);padding:4px 8px">${isBm ? '★' : '☆'}</button>
    </div>
    <div class="art-title">${a.title}</div>
    <div class="art-meta">
      <span class="art-src">${a.source}</span>
      <span class="art-date"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${dateStr}</span>
      <span class="art-rt"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>${a.readTime}</span>
    </div>
    <div class="art-hero-badge" style="display:flex;align-items:center;justify-content:center;gap:12px;padding:16px;margin:12px 0 16px;background:linear-gradient(135deg, rgba(255,45,85,0.06), rgba(255,45,85,0.02));border-radius:18px;border:1px solid rgba(255,45,85,0.1)">
      <div style="width:40px;height:40px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.04)">${getCatIcon(a.cat)}</div>
      <div style="font-size:13px;font-weight:700;color:var(--text)">Edisi Bacaan ${cats[a.cat] || 'Kesehatan Mental'}</div>
    </div>
    <div class="art-content">${a.content}</div>
    <div class="art-tags">${(a.tags||[]).map(t => `<span class="art-tag">${t}</span>`).join('')}</div>
  `;
  const ov = document.getElementById('art-ov');
  const sc = document.querySelector('.art-scroll');
  const bar = document.getElementById('art-progress');
  if (bar) bar.style.width = '0%';

  if (sc && bar) {
    sc.onscroll = () => {
      const max = sc.scrollHeight - sc.clientHeight;
      const pct = max > 0 ? (sc.scrollTop / max) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
    };
  }

  ov.style.display = 'flex';
  if (sc) sc.scrollTop = 0;
  ov.getBoundingClientRect();
  ov.classList.add('open');
  history.pushState({ art: true }, '');
}

export function closeArt() {
  const ov = document.getElementById('art-ov');
  if (!ov) return;
  ov.classList.remove('open');
  setTimeout(() => ov.style.display = '', 320);
}

/* ════════════════
   FALLBACK (10 artikel)
════════════════ */
function fallbackArticles() {
  return [
    {id:1,cat:'mood',emoji:'😊',source:'Halodoc',title:'5 Cara Alami Boost Mood di Pagi Hari',preview:'Pagi hari menentukan tone suasana hatimu seharian. Kenali cara sederhana yang terbukti efektif.',tags:['mood','pagi hari','tips'],readTime:'4 menit',content:'<p>Pernah bangun pagi tapi mood udah di lantai duluan? Kamu nggak sendirian.</p><h3>1. Buka Tirai</h3><p>Paparan sinar matahari memproduksi <strong>serotonin</strong>. 10–15 menit sudah cukup.</p><h3>2. Tunda Buka HP</h3><p>Gunakan 20 menit pertama untuk stretching atau menulis 3 hal syukur.</p><h3>3. Sarapan Bergizi</h3><p>Protein dan serat kompleks menstabilkan gula darah dan mood.</p><h3>4. Gerakan Ringan</h3><p>Jalan kaki 10 menit memicu pelepasan <strong>endorfin</strong> alami.</p><h3>5. Satu Niat Harian</h3><p>Tetapkan satu hal yang ingin kamu selesaikan. Mulai kecil, tapi mulai. 💚</p>'},
    {id:2,cat:'stres',emoji:'😰',source:'Alodokter',title:'Teknik 5-4-3-2-1 Grounding untuk Redakan Panik',preview:'Kecemasan mendadak bisa diredakan dalam 5 menit dengan teknik grounding sederhana ini.',tags:['kecemasan','grounding','panik'],readTime:'5 menit',content:'<p>Teknik <strong>5-4-3-2-1 Grounding</strong> mengalihkan fokus ke pengalaman inderawi saat ini.</p><ul><li><strong>5 hal yang bisa LIHAT</strong></li><li><strong>4 hal yang bisa RASAKAN</strong></li><li><strong>3 hal yang bisa DENGAR</strong></li><li><strong>2 hal yang bisa CIUM</strong></li><li><strong>1 hal yang bisa RASAKAN di mulut</strong></li></ul><blockquote>Grounding bukan menghilangkan cemas — ini tentang melewatinya dengan sadar.</blockquote><p>Kamu bisa melewati ini.</p>'},
    {id:3,cat:'tidur',emoji:'😴',source:'Klikdokter',title:'Kenapa 7–9 Jam Tidur Bisa Mengubah Segalanya',preview:'Kurang tidur bukan hanya soal ngantuk. Ada alasan neurologis mengapa tidur berkualitas adalah fondasi kesehatan mental.',tags:['tidur','sleep hygiene','otak'],readTime:'5 menit',content:'<p>Selama tidur, otak membersihkan limbah metabolik dan meregulasi hormon stres.</p><blockquote>Satu malam kurang tidur meningkatkan reaktivitas amigdala hingga 60%.</blockquote><ul><li><strong>Konsistensi waktu</strong> tidur dan bangun</li><li><strong>Stop layar</strong> 60 menit sebelum tidur</li><li><strong>Suhu kamar</strong> 18–20°C</li></ul><p>Investasi dalam sleep hygiene adalah salah satu hal terbaik untuk kesehatan mentalmu.</p>'},
    {id:4,cat:'self-care',emoji:'🛁',source:'SehatQ',title:'Self-Care Realistis untuk Kamu yang Sibuk',preview:'Self-care sejati bukan spa mahal. Ini tentang kebiasaan kecil yang kamu lakukan secara konsisten.',tags:['self-care','kebiasaan','well-being'],readTime:'5 menit',content:'<p>Self-care adalah tindakan <strong>sadar</strong> dan <strong>konsisten</strong> — bukan kemewahan sesekali.</p><ul><li><strong>Hidrasi sadar</strong> — minum air sambil merasakannya</li><li><strong>Pause 2 menit</strong> di antara task</li><li><strong>Check-in internal</strong> — aku butuh apa sekarang?</li></ul><blockquote>Kamu tidak bisa menuangkan dari gelas yang kosong.</blockquote><p>Kamu layak mendapat perhatian itu.</p>'},
    {id:5,cat:'motivasi',emoji:'💪',source:'Hellosehat',title:'Cara Bangkit Setelah Hari Paling Berat',preview:'Ada perbedaan besar antara move on paksa dan benar-benar pulih.',tags:['resiliensi','self-compassion','bangkit'],readTime:'5 menit',content:'<p><strong>Emosi bukan musuh — melainkan informasi yang perlu didengar.</strong></p><h3>Langkah 1: Izinkan Dirimu Merasa</h3><p>Hari ini berat. Itu nyata. Mengakuinya bukan kelemahan.</p><h3>Langkah 2: Dekompresi</h3><ul><li>Jalan kaki tanpa earphone</li><li>Tulis semua yang bikin frustrasi</li></ul><blockquote>Resiliensi bukan tentang tidak pernah jatuh. Ini tentang cara kita bangkit.</blockquote><p>Kamu sudah selamat hari ini. Itu sudah sangat berharga.</p>'},
    {id:6,cat:'mood',emoji:'🥗',source:'Riliv Blog',title:'Makanan yang Diam-Diam Mengontrol Mood Kamu',preview:'Gut-brain connection bukan mitos. Apa yang kamu makan langsung berdampak pada perasaanmu.',tags:['nutrisi','gut-brain','mood'],readTime:'5 menit',content:'<p>Sekitar <strong>90–95% serotonin</strong> diproduksi di usus, bukan di otak.</p><ul><li><strong>Ikan berlemak</strong> — Omega-3 mengurangi peradangan otak</li><li><strong>Fermentasi (tempe, yogurt)</strong> — probiotik menjaga mikrobioma</li><li><strong>Dark chocolate 70%+</strong> — memicu endorfin</li><li><strong>Pisang</strong> — mengandung tryptophan</li></ul><p>Jadikan makanan sebagai salah satu cara merawat dirimu.</p>'},
    {id:7,cat:'stres',emoji:'🧘',source:'Kompas Health',title:'Meditasi 5 Menit yang Benar-Benar Efektif',preview:'Meditasi tidak harus duduk berjam-jam. Bahkan 5 menit bisa mengubah respons stres otak kamu.',tags:['meditasi','mindfulness','stres'],readTime:'4 menit',content:'<p>Penelitian menunjukkan meditasi 5 menit sehari selama 8 minggu secara fisik mengubah struktur amigdala.</p><h3>Teknik Box Breathing</h3><ul><li>Hirup 4 hitungan</li><li>Tahan 4 hitungan</li><li>Buang 4 hitungan</li><li>Tahan 4 hitungan</li></ul><p>Lakukan 4 siklus. Sistem sistem sarafmu akan merespons.</p>'},
    {id:8,cat:'tidur',emoji:'🌙',source:'Alodokter',title:'Rutinitas Malam 30 Menit untuk Tidur Berkualitas',preview:'Apa yang kamu lakukan 30 menit sebelum tidur menentukan kualitas tidurmu malam itu.',tags:['tidur','rutinitas','relaksasi'],readTime:'4 menit',content:'<p>Otak butuh sinyal bahwa hari sudah selesai. Rutinitas malam adalah sinyal itu.</p><h3>Urutan Ideal</h3><ul><li><strong>Menit 0-10:</strong> Matikan semua notifikasi, redupkan lampu</li><li><strong>Menit 10-20:</strong> Stretching ringan atau journaling</li><li><strong>Menit 20-30:</strong> Baca buku fisik atau dengar podcast tenang</li></ul><p>Konsistensi adalah kuncinya — tubuhmu akan belajar rileks.</p>'},
    {id:9,cat:'self-care',emoji:'✍️',source:'Hellosehat',title:'Journaling untuk Pemula: Mulai dari Mana?',preview:'Menulis perasaan terbukti secara ilmiah mengurangi stres dan meningkatkan kesejahteraan mental.',tags:['journaling','self-care','menulis'],readTime:'5 menit',content:'<p>James Pennebaker, peneliti psikologi, menemukan <strong>expressive writing</strong> selama 15-20 menit mengurangi kunjungan dokter hingga 43%.</p><h3>3 Prompt untuk Mulai</h3><ul><li>Hari ini aku merasa... karena...</li><li>Satu hal yang aku syukuri adalah...</li><li>Besok aku ingin...</li></ul><blockquote>Tidak perlu bagus. Tidak perlu panjang. Cukup jujur.</blockquote><p>Mulai 5 menit saja. Penamu lebih kuat dari yang kamu kira.</p>'},
    {id:10,cat:'motivasi',emoji:'🌱',source:'Riliv Blog',title:'Kenapa Kamu Tidak Perlu Produktif Setiap Hari',preview:'Hustle culture mengajarkan kita bahwa istirahat adalah kelemahan. Ilmu pengetahuan tidak setuju.',tags:['rest','produktivitas','burnout'],readTime:'5 menit',content:'<p>Otak manusia tidak dirancang untuk produktif terus-menerus. <strong>Default Mode Network</strong> — bagian otak yang aktif saat istirahat — justru penting untuk kreativitas dan pemrosesan emosi.</p><h3>Rest yang Sesungguhnya</h3><ul><li>Tidur berkualitas</li><li>Waktu tanpa agenda</li><li>Aktivitas yang menyenangkan tanpa output</li></ul><blockquote>Kamu bukan mesin. Istirahat bukan kemewahan — itu kebutuhan biologis.</blockquote><p>Beri dirimu izin untuk berhenti dan bernapas sejenak.</p>'},
  ];
}