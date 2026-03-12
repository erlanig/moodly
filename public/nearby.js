/* ═══════════════════════════════════════
   MOODLY — nearby.js  (v5 — debug + no GPS block)
═══════════════════════════════════════ */

let nb = {
  loading  : false,
  results  : [],
  cityName : '',
  lastFetch: null,
  filter   : 'semua',
};

const FILTERS = [
  { id:'semua',     label:'Semua',    emoji:'🗺️' },
  { id:'psikolog',  label:'Psikolog', emoji:'🧠' },
  { id:'psikiater', label:'Psikiater',emoji:'🏥' },
  { id:'klinik',    label:'Klinik',   emoji:'🏨' },
  { id:'online',    label:'Online',   emoji:'💻' },
];

export function initNearby() {
  const el = document.getElementById('nearby-wrap');
  if (!el) return;
  if (nb.results.length && nb.lastFetch && (Date.now() - nb.lastFetch) < 30*60*1000) {
    renderResults(nb.results, nb.filter);
    return;
  }
  el.innerHTML = `
    <div class="nb-idle">
      <div class="nb-idle-ico">🏥</div>
      <div class="nb-idle-txt">Temukan psikolog, psikiater & klinik mental health terdekat dari lokasimu</div>
      <button class="nb-cta" onclick="window._findNearby()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Cari Layanan Terdekat
      </button>
    </div>`;
}

export async function findNearby() {
  if (nb.loading) return;
  nb.loading = true;

  const el = document.getElementById('nearby-wrap');
  if (!el) { nb.loading = false; return; }

  el.innerHTML = `
    <div class="nb-loading">
      <div class="nb-dots"><div class="nb-dot"></div><div class="nb-dot"></div><div class="nb-dot"></div></div>
      <div class="nb-loading-txt" id="nb-status">Menyiapkan pencarian…</div>
    </div>`;

  const setStatus = t => { const s = document.getElementById('nb-status'); if(s) s.textContent = t; };

  // ── Step 1: GPS (opsional, tidak block jika gagal) ──
  let coordStr = '';
  try {
    setStatus('Mendeteksi lokasi GPS…');
    const coords = await Promise.race([
      getLocation(),
      new Promise((_,r) => setTimeout(() => r(new Error('timeout')), 8000))
    ]);
    coordStr = `${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
    setStatus('Lokasi terdeteksi. Mencari layanan…');
  } catch (gpsErr) {
    console.warn('[nearby] GPS skip:', gpsErr.message);
    coordStr = '';
    setStatus('Mencari layanan kesehatan mental Indonesia…');
  }

  // ── Step 2: Call Claude (sama persis seperti news.js) ──
  const today = new Date().toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const locationHint = coordStr
    ? `Koordinat GPS pengguna: ${coordStr}. Tentukan kota/area dari koordinat ini dan cari layanan di sana.`
    : `Lokasi GPS tidak tersedia. Tampilkan layanan populer di Jakarta dan layanan online nasional.`;

  const prompt = `Kamu asisten kesehatan mental Indonesia yang membantu menemukan layanan profesional terpercaya.
Tanggal: ${today}.
${locationHint}

Gunakan web_search untuk mencari layanan nyata dan aktif. Cari:
1. "psikolog klinik [kota] 2025" 
2. "konseling online Indonesia terpercaya"

Buat 8 rekomendasi: campuran psikolog, psikiater, klinik lokal, dan min 2 layanan online nasional (Riliv, Into The Light Indonesia, Yayasan Pulih).

Kembalikan HANYA JSON ini, tanpa teks lain, tanpa markdown:
{"city":"<nama kota>","items":[{"id":1,"type":"psikolog","name":"<nama>","address":"<alamat>","area":"<kota>","rating":4.5,"reviewCount":100,"phone":"<nomor atau null>","website":"<url atau null>","hours":"<jam>","priceRange":"<harga>","tags":["<tag>"],"isOnline":false,"emoji":"🧠","description":"<1 kalimat>"}]}`;

  try {
    console.log('[nearby] calling API...');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model     : 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        tools     : [{ type:'web_search_20250305', name:'web_search' }],
        messages  : [{ role:'user', content: prompt }],
      })
    });

    console.log('[nearby] HTTP status:', res.status);

    if (!res.ok) {
      const errBody = await res.text().catch(()=>'');
      console.warn('[nearby] API error body:', errBody.slice(0,300));
      throw new Error('http_' + res.status);
    }

    const data = await res.json();
    console.log('[nearby] stop_reason:', data.stop_reason, '| blocks:', data.content?.map(c=>c.type).join(','));

    const raw = (data.content || [])
      .filter(c => c.type === 'text')
      .map(c => c.text || '')
      .join('');

    console.log('[nearby] raw text:', raw.slice(0, 400));

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no_json');

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.items) || !parsed.items.length) throw new Error('empty');

    nb.results   = parsed.items;
    nb.cityName  = parsed.city || 'Area kamu';
    nb.lastFetch = Date.now();
    nb.loading   = false;
    renderResults(nb.results, nb.filter);

  } catch(e) {
    nb.loading = false;
    console.error('[nearby] FINAL ERROR:', e.message, e);
    showError(el, e.message);
  }
}

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no_geo')); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      e => reject(new Error('gps_err_' + e.code)),
      { timeout: 7000, maximumAge: 600000, enableHighAccuracy: false }
    );
  });
}

export function renderResults(results, filter) {
  nb.filter = filter;
  const el = document.getElementById('nearby-wrap');
  if (!el) return;
  const list = filter === 'semua' ? results : results.filter(r => r.type === filter);

  el.innerHTML = `
    <div class="nb-header">
      <div class="nb-city">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#1db954" stroke-width="2"/>
          <circle cx="12" cy="10" r="3" stroke="#1db954" stroke-width="2"/>
        </svg>
        ${nb.cityName}
      </div>
      <button class="nb-refresh" onclick="window._refreshNearby()">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Perbarui
      </button>
    </div>
    <div class="nb-filters">
      ${FILTERS.map(f => `
        <button class="nb-ftab ${filter===f.id?'on':''}" onclick="window._filterNearby('${f.id}')">
          ${f.emoji} ${f.label}
        </button>`).join('')}
    </div>
    <div class="nb-count-row"><span class="nb-count">${list.length} layanan ditemukan</span></div>
    <div class="nb-list">
      ${list.length ? list.map(cardHTML).join('') : `<div class="nb-empty">Tidak ada layanan untuk kategori ini.</div>`}
    </div>`;
}

function cardHTML(r) {
  const labels = {psikolog:'Psikolog',psikiater:'Psikiater',klinik:'Klinik',online:'Online'};
  const safe = (r.name||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
  return `<div class="nb-card">
    <div class="nb-card-top">
      <div class="nb-card-emoji">${r.emoji||'🏥'}</div>
      <div class="nb-card-info">
        <div class="nb-card-name">${r.name||'—'}</div>
        <div class="nb-card-area">${r.isOnline
          ?`<svg width="9" height="9" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1db954" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="#1db954" stroke-width="2"/></svg> Layanan Online`
          :`<svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#1db954" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="#1db954" stroke-width="2"/></svg> ${r.area||''}`}
        </div>
        <div class="nb-rating-row">
          ${starsHTML(r.rating||4.0)}
          <span class="nb-rating-num">${(r.rating||4.0).toFixed(1)}</span>
          <span class="nb-review-cnt">(${r.reviewCount||'—'})</span>
        </div>
      </div>
      <span class="nb-badge nb-badge-${r.type||'klinik'}">${labels[r.type]||r.type}</span>
    </div>
    ${r.description?`<div class="nb-card-desc">${r.description}</div>`:''}
    <div class="nb-card-meta">
      <div class="nb-meta-item">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#8aab97" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#8aab97" stroke-width="2" stroke-linecap="round"/></svg>
        ${r.hours||'Sesuai appointment'}
      </div>
      <div class="nb-meta-item">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><line x1="12" y1="1" x2="12" y2="23" stroke="#8aab97" stroke-width="2"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#8aab97" stroke-width="2" stroke-linecap="round"/></svg>
        ${r.priceRange||'Hubungi untuk info harga'}
      </div>
    </div>
    ${r.tags?.length?`<div class="nb-tags">${r.tags.slice(0,3).map(t=>`<span class="nb-tag">${t}</span>`).join('')}</div>`:''}
    <div class="nb-card-actions">
      ${r.phone?`<a class="nb-btn nb-btn-call" href="tel:${r.phone}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.01 2.34 2 2 0 012 .16h3a2 2 0 012 1.72 12.05 12.05 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.05 12.05 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg> Hubungi</a>`:''}
      ${r.website?`<a class="nb-btn nb-btn-web" href="${r.website}" target="_blank" rel="noopener"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" stroke-width="2"/></svg> Website</a>`
      :`<button class="nb-btn nb-btn-web" onclick="window._searchNearby('${safe}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg> Lihat di Maps</button>`}
    </div>
  </div>`;
}

function starsHTML(rating) {
  const r = Math.round((rating||0)*2)/2;
  let h='';
  for(let i=1;i<=5;i++){const on=i<=r;h+=`<svg width="9" height="9" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="${on?'#f57c00':'#e0f0e8'}" stroke="${on?'#f57c00':'#c5dfd0'}" stroke-width="1"/></svg>`;}
  return `<div class="nb-stars">${h}</div>`;
}

function showError(el, code) {
  const msgs = {
    denied    :{ico:'📍',title:'Izin Lokasi Ditolak',   sub:'Aktifkan izin lokasi di pengaturan browser.'},
    no_geo    :{ico:'📱',title:'GPS Tidak Tersedia',     sub:'Browser tidak mendukung geolocation.'},
    no_json   :{ico:'🔄',title:'Data Tidak Valid',       sub:'Terjadi kesalahan format. Coba lagi.'},
    empty     :{ico:'🔍',title:'Tidak Ada Hasil',        sub:'Coba perbarui atau periksa koneksi.'},
    http_401  :{ico:'🔑',title:'API Key Tidak Valid',    sub:'Hubungi developer aplikasi ini.'},
    http_403  :{ico:'🔑',title:'Akses Ditolak',          sub:'Hubungi developer aplikasi ini.'},
    http_429  :{ico:'⏱️',title:'Terlalu Banyak Request', sub:'Tunggu beberapa menit lalu coba lagi.'},
  };
  const m = msgs[code] || {ico:'⚠️',title:'Gagal Memuat',sub:`Terjadi kesalahan (${code}). Coba lagi.`};
  el.innerHTML = `
    <div class="nb-error">
      <div class="nb-error-ico">${m.ico}</div>
      <div class="nb-error-title">${m.title}</div>
      <div class="nb-error-sub">${m.sub}</div>
      <button class="nb-cta" onclick="window._findNearby()">Coba Lagi</button>
    </div>`;
}

export function filterNearby(t){nb.filter=t;if(nb.results.length)renderResults(nb.results,t);}
export function refreshNearby(){nb.results=[];nb.lastFetch=null;findNearby();}
export function searchNearby(name){window.open(`https://maps.google.com/maps?q=${encodeURIComponent(name+' kesehatan mental')}`,'_blank');}