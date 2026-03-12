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
   TOPIC ROTATION — 20 set, tiap 6 jam beda
════════════════ */
const TOPICS = [
  ['meningkatkan mood pagi hari alami','teknik grounding kecemasan panik','sleep hygiene tidur berkualitas','self-care realistis sehari-hari','bangkit setelah hari berat','makanan pengaruhi mood','journaling manfaat mental','olahraga dan kesehatan jiwa','mengelola stres kerja','dopamin kebiasaan positif'],
  ['mengatasi overthinking efektif','sindrom impostor cara atasi','screen time kesehatan mental','gratitude dan kebahagiaan','burnout tanda dan pulih','kecemasan sosial tips','self-compassion pentingnya','cara tenang saat panik','kebiasaan pagi positif','digital detox manfaat'],
  ['terapi CBT manfaat cara kerja','mindful eating hubungan makanan','inner child healing pengantar','afirmasi positif cara kerja','peer support kesehatan mental','rutinitas malam tidur berkualitas','batas sehat dalam hubungan','cara kerja hormon stres','manfaat alam untuk jiwa','emotional regulation dasar'],
  ['pola pikir growth mindset','cara kerja anxiety di otak','kekuatan bercerita untuk healing','istirahat aktif vs pasif','regulasi emosi anak muda','self-esteem membangun kembali','nutrisi otak dan emosi','melepaskan perfeksionisme','mengatasi kesepian kota besar','produktivitas tanpa burnout'],
  ['hubungan toxic cara kenali','cara minta bantuan psikolog','musik dan kesehatan mental','tertawa manfaat psikologis','kreativitas sebagai healing','menulis diary manfaat ilmiah','meditasi body scan panduan','napas dalam teknik efektif','alam dan stress reduction','sleep debt cara bayar'],
  ['attachment style hubungan','cara kerja trauma di otak','mindfulness untuk pemula','acceptance commitment therapy','polyvagal theory sederhana','window of tolerance explained','co-regulation dengan orang lain','neuroception dan rasa aman','interoception latihan kesadaran','vagus nerve stimulasi alami'],
  ['morning routine kesehatan mental','evening routine winding down','exercise dopamine serotonin','cold shower mental health','sunlight circadian rhythm','social connection loneliness','purpose meaning life psychology','flow state cara mencapai','awe experience manfaat mental','nature deficit disorder solusi'],
  ['gaslighting cara kenali','people pleasing cara berhenti','emotional labor yang melelahkan','hypervigilance cara tenangkan','fawn response trauma healing','dissociation grounding teknik','intrusive thoughts cara hadapi','rumination vs reflection beda','catastrophizing cara hentikan','mind reading cognitive distortion'],
  ['self-worth vs self-esteem','inner critic cara reframe','shame vs guilt perbedaan','vulnerability kekuatan bukan lemah','boundaries setting cara praktis','assertiveness communication skills','emotional intelligence meningkatkan','empathy vs sympathy beda','active listening cara benar','nonviolent communication dasar'],
  ['hormonal mood changes wanita','pms pmdd perbedaan dan solusi','siklus menstruasi dan emosi','ovulasi dan energi puncak','luteal phase mood support','menstruasi self-care terbaik','cycle syncing produktivitas','estrogen progesterone mood','cortisol dan stress wanita','iron deficiency mood perempuan'],
  ['diet mediterranean mental health','gut microbiome dan depresi','omega 3 otak dan mood','magnesium stress dan tidur','vitamin d deficiency mood','fermented food mental health','blood sugar mood stability','hydration brain function','caffeine anxiety hubungan','alcohol dan depresi faktanya'],
  ['toxic positivity bahayanya','bypass spiritual apa itu','self-help trap cara hindari','hustle culture bahaya mental','comparison social media efek','doomscrolling cara berhenti','FOMO cara atasi','cancel culture mental toll','information overload solusi','news consumption batas sehat'],
  ['grief stages cara hadapi','kehilangan pekerjaan mental health','relationship ending healing','moving to new city loneliness','identity crisis quarter life','midlife transition cara hadapi','retirement mental health','chronic illness mental support','caregiver burnout cara pulih','empty nest syndrome solusi'],
  ['workplace anxiety cara atasi','imposter syndrome remote work','meeting fatigue zoom solusi','work life balance nyata','toxic boss cara survive','micromanagement dampak mental','praise seeking validation kerja','perfectionisme di tempat kerja','career change anxiety normal','promotion anxiety cara hadapi'],
  ['childhood emotional neglect','reparenting diri sendiri cara','inner child work panduan','generational trauma cara putus','family dynamics dan mental health','sibling rivalry dampak dewasa','enmeshment vs closeness keluarga','parentification dan healing','critical parents cara hadapi','healthy family communication'],
  ['introvert recharge cara efektif','extrovert kebutuhan sosial','ambivert memahami diri','highly sensitive person tips','ADHD emotional dysregulation','autism masking kelelahan','anxiety vs intuition beda','depression vs sadness beda','bipolar mood tracking tips','OCD intrusive thoughts hadapi'],
  ['insomnia cognitive behavioral','sleep apnea dan mental health','hypnagogic hallucinations normal','lucid dreaming dan kesehatan','sleep paralysis cara atasi','napping power nap efektif','chronotype dan produktivitas','jet lag mental recovery','shift work mental health','screen sebelum tidur efek'],
  ['social anxiety party survival','public speaking fear atasi','first date anxiety tips','job interview anxiety hilangkan','doctor visit anxiety hadapi','phone call anxiety tips','crowded place anxiety grounding','performance anxiety olahraga','test anxiety cara atasi','driving anxiety cara hilangkan'],
  ['anger management teknik efektif','jealousy dan insecurity atasi','loneliness vs solitude beda','boredom dan kreativitas','guilt productive vs toxic','regret cara hadapi sehat','envy cara transformasi positif','fear of failure reframe','rejection sensitivity cara atasi','disappointment recovery cepat'],
  ['self-sabotage cara kenali','procrastination psikologi dalam','decision fatigue cara kurangi','analysis paralysis cara keluar','comfort zone expansion gradual','learned helplessness cara balik','avoidance behavior cara hadapi','safety behavior anxiety','reassurance seeking cara stop','body dysmorphia awal kenali'],
];

const CATMAP = [
  'mood','stres','tidur','self-care','motivasi','mood','stres','tidur','self-care','motivasi',
];

/* ════════════════
   DATE / TIME HELPERS
════════════════ */
function slotKey() {
  const d    = new Date();
  const slot = Math.floor(d.getHours() / 6);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-s${slot}`;
}

function todayLabel() {
  return new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' });
}

function slotLabel() {
  const h = new Date().getHours();
  if (h < 6)  return 'Dini Hari';
  if (h < 12) return 'Pagi';
  if (h < 18) return 'Siang';
  return 'Malam';
}

function getTopicIndex() {
  const key  = slotKey();
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash % TOPICS.length;
}

/* ════════════════
   INIT
════════════════ */
export async function initNews() {
  const slot = slotLabel();
  document.getElementById('date-pill').innerHTML = `
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="#0a9e3f" stroke-width="2"/><path d="M3 10h18M8 2v4M16 2v4" stroke="#0a9e3f" stroke-width="2"/></svg>
    ${todayLabel()} · ${slot}`;

  const currentKey = slotKey();
  const cached     = await loadNewsCache();

  // ✅ FIXED: bandingkan key slot secara eksplisit
  const cacheValid = cached && cached.key === currentKey && Array.isArray(cached.arts) && cached.arts.length >= 1;

  if (cacheValid) {
    artStore = cached.arts;
    renderNews(artStore, curFilter);
    buildHomePreview();
  } else {
    await loadArticles();
  }
}

/* ════════════════
   FETCH ARTICLES — dengan web search untuk berita terkini
════════════════ */
async function loadArticles() {
  document.getElementById('news-wrap').innerHTML = `
    <div class="ldwrap">
      <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
      <div class="ld-txt">Mencari berita & menyiapkan 10 artikel ${slotLabel().toLowerCase()} ini…</div>
    </div>`;

  const today  = new Date();
  const topics = TOPICS[getTopicIndex()];
  const cats   = topics.map((_,i) => CATMAP[i % CATMAP.length]);

  const prompt = `Kamu penulis kesehatan mental Indonesia yang hangat dan berbasis bukti ilmiah.
Tanggal hari ini: ${today.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}.

PENTING: Sebelum menulis, gunakan web_search untuk mencari 2–3 berita atau studi kesehatan mental terbaru dari Indonesia hari ini atau minggu ini. Sertakan konteks berita terkini ini sebagai referensi relevan di dalam artikel yang sesuai topiknya.

Tulis tepat 10 artikel lengkap dan unik. Topik (satu artikel per topik, urutan sama):
${topics.map((t,i) => `${i+1}. ${t}`).join('\n')}

Kembalikan HANYA JSON array valid, tanpa markdown, tanpa teks di luar JSON:
[{"id":1,"cat":"${cats[0]}","emoji":"<emoji>","source":"<Halodoc|Alodokter|Klikdokter|SehatQ|Kompas Health|Hellosehat|Riliv Blog|Into The Light|Yayasan Pulih>","title":"<judul max 12 kata>","preview":"<2 kalimat menarik, bila relevan sebutkan konteks berita terkini>","tags":["<tag1>","<tag2>","<tag3>"],"readTime":"<X menit>","content":"<HTML artikel min 400 kata: pakai p h3 blockquote ul li strong, bahasa hangat relatable, ada tips praktis, bila ada berita terkini yang relevan sisipkan sebagai konteks informatif, akhiri dengan kalimat motivasi>"},...]
Kategori tiap artikel berurutan: ${cats.join(', ')}`;

  try {
    // ✅ FIXED: tambahkan web_search tool agar Claude bisa fetch berita terkini
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10000,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search'
          }
        ],
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await res.json();

    // ✅ FIXED: ekstrak teks dari semua blok (termasuk setelah tool_use)
    const raw = data.content
      .filter(c => c.type === 'text')
      .map(c => c.text || '')
      .join('');

    const arts = JSON.parse(raw.replace(/```json|```/g,'').trim());
    artStore = arts;
    // ✅ FIXED: simpan dengan key slot yang benar
    await saveNewsCache(slotKey(), arts);
    renderNews(arts, curFilter);
    buildHomePreview();
  } catch (e) {
    console.warn('[news] fetch failed, using fallback', e.message);
    artStore = fallbackArticles();
    await saveNewsCache(slotKey(), artStore);
    renderNews(artStore, curFilter);
    buildHomePreview();
  }
}

export async function forceRefresh() {
  const ic = document.getElementById('rf-ic');
  ic.style.transition = 'transform .45s';
  ic.style.transform  = 'rotate(360deg)';
  setTimeout(() => { ic.style.transition=''; ic.style.transform=''; }, 460);
  // ✅ FIXED: hapus cache dengan key kosong agar pasti invalid
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
      <div><div class="prev-src">Artikel Harian</div><div class="prev-title">10 tips kesehatan mental berganti tiap 6 jam →</div></div>
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
   FALLBACK (10 artikel)
════════════════ */
function fallbackArticles() {
  return [
    {id:1,cat:'mood',emoji:'😊',source:'Halodoc',title:'5 Cara Alami Boost Mood di Pagi Hari',preview:'Pagi hari menentukan tone suasana hatimu seharian. Kenali cara sederhana yang terbukti efektif.',tags:['mood','pagi hari','tips'],readTime:'4 menit',content:'<p>Pernah bangun pagi tapi mood udah di lantai duluan? Kamu nggak sendirian.</p><h3>1. Buka Tirai</h3><p>Paparan sinar matahari memproduksi <strong>serotonin</strong>. 10–15 menit sudah cukup.</p><h3>2. Tunda Buka HP</h3><p>Gunakan 20 menit pertama untuk stretching atau menulis 3 hal syukur.</p><h3>3. Sarapan Bergizi</h3><p>Protein dan serat kompleks menstabilkan gula darah dan mood.</p><h3>4. Gerakan Ringan</h3><p>Jalan kaki 10 menit memicu pelepasan <strong>endorfin</strong> alami.</p><h3>5. Satu Niat Harian</h3><p>Tetapkan satu hal yang ingin kamu selesaikan. Mulai kecil, tapi mulai. 💚</p>'},
    {id:2,cat:'stres',emoji:'😰',source:'Alodokter',title:'Teknik 5-4-3-2-1 Grounding untuk Redakan Panik',preview:'Kecemasan mendadak bisa diredakan dalam 5 menit dengan teknik grounding sederhana ini.',tags:['kecemasan','grounding','panik'],readTime:'5 menit',content:'<p>Teknik <strong>5-4-3-2-1 Grounding</strong> mengalihkan fokus ke pengalaman inderawi saat ini.</p><ul><li><strong>5 hal yang bisa LIHAT</strong></li><li><strong>4 hal yang bisa RASAKAN</strong></li><li><strong>3 hal yang bisa DENGAR</strong></li><li><strong>2 hal yang bisa CIUM</strong></li><li><strong>1 hal yang bisa RASAKAN di mulut</strong></li></ul><blockquote>Grounding bukan menghilangkan cemas — ini tentang melewatinya dengan sadar.</blockquote><p>Kamu bisa melewati ini. 💙</p>'},
    {id:3,cat:'tidur',emoji:'😴',source:'Klikdokter',title:'Kenapa 7–9 Jam Tidur Bisa Mengubah Segalanya',preview:'Kurang tidur bukan hanya soal ngantuk. Ada alasan neurologis mengapa tidur berkualitas adalah fondasi kesehatan mental.',tags:['tidur','sleep hygiene','otak'],readTime:'5 menit',content:'<p>Selama tidur, otak membersihkan limbah metabolik dan meregulasi hormon stres.</p><blockquote>Satu malam kurang tidur meningkatkan reaktivitas amigdala hingga 60%.</blockquote><ul><li><strong>Konsistensi waktu</strong> tidur dan bangun</li><li><strong>Stop layar</strong> 60 menit sebelum tidur</li><li><strong>Suhu kamar</strong> 18–20°C</li></ul><p>Investasi dalam sleep hygiene adalah salah satu hal terbaik untuk mental health kamu. 🌙</p>'},
    {id:4,cat:'self-care',emoji:'🛁',source:'SehatQ',title:'Self-Care Realistis untuk Kamu yang Sibuk',preview:'Self-care sejati bukan spa mahal. Ini tentang kebiasaan kecil yang kamu lakukan secara konsisten.',tags:['self-care','kebiasaan','well-being'],readTime:'5 menit',content:'<p>Self-care adalah tindakan <strong>sadar</strong> dan <strong>konsisten</strong> — bukan kemewahan sesekali.</p><ul><li><strong>Hidrasi sadar</strong> — minum air sambil merasakannya</li><li><strong>Pause 2 menit</strong> di antara task</li><li><strong>Check-in internal</strong> — aku butuh apa sekarang?</li></ul><blockquote>Kamu tidak bisa menuangkan dari gelas yang kosong.</blockquote><p>Kamu layak mendapat perhatian itu. 🌱</p>'},
    {id:5,cat:'motivasi',emoji:'💪',source:'Hellosehat',title:'Cara Bangkit Setelah Hari Paling Berat',preview:'Ada perbedaan besar antara move on paksa dan benar-benar pulih.',tags:['resiliensi','self-compassion','bangkit'],readTime:'5 menit',content:'<p><strong>Emosi bukan musuh — melainkan informasi yang perlu didengar.</strong></p><h3>Langkah 1: Izinkan Dirimu Merasa</h3><p>Hari ini berat. Itu nyata. Mengakuinya bukan kelemahan.</p><h3>Langkah 2: Dekompresi</h3><ul><li>Jalan kaki tanpa earphone</li><li>Tulis semua yang bikin frustrasi</li></ul><blockquote>Resiliensi bukan tentang tidak pernah jatuh. Ini tentang cara kita bangkit.</blockquote><p>Kamu sudah selamat hari ini. Itu cukup. 💚</p>'},
    {id:6,cat:'mood',emoji:'🥗',source:'Riliv Blog',title:'Makanan yang Diam-Diam Mengontrol Mood Kamu',preview:'Gut-brain connection bukan mitos. Apa yang kamu makan langsung berdampak pada perasaanmu.',tags:['nutrisi','gut-brain','mood'],readTime:'5 menit',content:'<p>Sekitar <strong>90–95% serotonin</strong> diproduksi di usus, bukan di otak.</p><ul><li><strong>Ikan berlemak</strong> — Omega-3 mengurangi peradangan otak</li><li><strong>Fermentasi (tempe, yogurt)</strong> — probiotik menjaga mikrobioma</li><li><strong>Dark chocolate 70%+</strong> — memicu endorfin</li><li><strong>Pisang</strong> — mengandung tryptophan</li></ul><p>Jadikan makanan sebagai salah satu cara merawat dirimu. 🌿</p>'},
    {id:7,cat:'stres',emoji:'🧘',source:'Kompas Health',title:'Meditasi 5 Menit yang Benar-Benar Efektif',preview:'Meditasi tidak harus duduk berjam-jam. Bahkan 5 menit bisa mengubah respons stres otak kamu.',tags:['meditasi','mindfulness','stres'],readTime:'4 menit',content:'<p>Penelitian menunjukkan meditasi 5 menit sehari selama 8 minggu secara fisik mengubah struktur amigdala.</p><h3>Teknik Box Breathing</h3><ul><li>Hirup 4 hitungan</li><li>Tahan 4 hitungan</li><li>Buang 4 hitungan</li><li>Tahan 4 hitungan</li></ul><p>Lakukan 4 siklus. Sistem saraf kamu akan merespons. 🌬️</p>'},
    {id:8,cat:'tidur',emoji:'🌙',source:'Alodokter',title:'Rutinitas Malam 30 Menit untuk Tidur Berkualitas',preview:'Apa yang kamu lakukan 30 menit sebelum tidur menentukan kualitas tidurmu malam itu.',tags:['tidur','rutinitas','relaksasi'],readTime:'4 menit',content:'<p>Otak butuh sinyal bahwa hari sudah selesai. Rutinitas malam adalah sinyal itu.</p><h3>Urutan Ideal</h3><ul><li><strong>Menit 0-10:</strong> Matikan semua notifikasi, redupkan lampu</li><li><strong>Menit 10-20:</strong> Stretching ringan atau journaling</li><li><strong>Menit 20-30:</strong> Baca buku fisik atau dengar podcast tenang</li></ul><p>Konsistensi adalah kuncinya — tubuhmu akan belajar. 🌙</p>'},
    {id:9,cat:'self-care',emoji:'✍️',source:'Hellosehat',title:'Journaling untuk Pemula: Mulai dari Mana?',preview:'Menulis perasaan terbukti secara ilmiah mengurangi stres dan meningkatkan kesejahteraan mental.',tags:['journaling','self-care','menulis'],readTime:'5 menit',content:'<p>James Pennebaker, peneliti psikologi, menemukan <strong>expressive writing</strong> selama 15-20 menit mengurangi kunjungan dokter hingga 43%.</p><h3>3 Prompt untuk Mulai</h3><ul><li>Hari ini aku merasa... karena...</li><li>Satu hal yang aku syukuri adalah...</li><li>Besok aku ingin...</li></ul><blockquote>Tidak perlu bagus. Tidak perlu panjang. Cukup jujur.</blockquote><p>Mulai 5 menit saja. Penamu lebih kuat dari yang kamu kira. ✨</p>'},
    {id:10,cat:'motivasi',emoji:'🌱',source:'Riliv Blog',title:'Kenapa Kamu Tidak Perlu Produktif Setiap Hari',preview:'Hustle culture mengajarkan kita bahwa istirahat adalah kelemahan. Ilmu pengetahuan tidak setuju.',tags:['rest','produktivitas','burnout'],readTime:'5 menit',content:'<p>Otak manusia tidak dirancang untuk produktif terus-menerus. <strong>Default Mode Network</strong> — bagian otak yang aktif saat istirahat — justru penting untuk kreativitas dan pemrosesan emosi.</p><h3>Rest yang Sesungguhnya</h3><ul><li>Tidur berkualitas</li><li>Waktu tanpa agenda</li><li>Aktivitas yang menyenangkan tanpa output</li></ul><blockquote>Kamu bukan mesin. Istirahat bukan kemewahan — itu kebutuhan biologis.</blockquote><p>Beri dirimu izin untuk berhenti sejenak. 💚</p>'},
  ];
}