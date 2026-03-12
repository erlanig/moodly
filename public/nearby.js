/* ═══════════════════════════════════════
   MOODLY — nearby.js  (v2 — robust)
   Rekomendasi layanan kesehatan mental terdekat
   ═══════════════════════════════════════ */

/* ════════════════  STATE  ════════════════ */
let nearbyState = {
  loading  : false,
  results  : [],
  cityName : '',
  lastFetch: null,
  filter   : 'semua',
};

const FILTER_TYPES = [
  { id:'semua',     label:'Semua',    emoji:'🗺️' },
  { id:'psikolog',  label:'Psikolog', emoji:'🧠' },
  { id:'psikiater', label:'Psikiater',emoji:'🏥' },
  { id:'klinik',    label:'Klinik',   emoji:'🏨' },
  { id:'online',    label:'Online',   emoji:'💻' },
];

/* ════════════════  INIT  ════════════════ */
export function initNearby() {
  const el = document.getElementById('nearby-wrap');
  if (!el) return;

  // Reuse cache kalau < 30 menit
  if (nearbyState.results.length && nearbyState.lastFetch &&
      (Date.now() - nearbyState.lastFetch) < 30 * 60 * 1000) {
    renderResults(nearbyState.results, nearbyState.filter);
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

/* ════════════════  FIND  ════════════════ */
export async function findNearby() {
  if (nearbyState.loading) return;
  nearbyState.loading = true;

  const el = document.getElementById('nearby-wrap');
  if (!el) { nearbyState.loading = false; return; }

  el.innerHTML = `
    <div class="nb-loading">
      <div class="nb-dots">
        <div class="nb-dot"></div><div class="nb-dot"></div><div class="nb-dot"></div>
      </div>
      <div class="nb-loading-txt">Mencari layanan kesehatan mental terdekat…</div>
    </div>`;

  try {
    // 1. Dapatkan koordinat
    const coords = await getUserLocation();

    // 2. Reverse geocode (nominatim)
    let cityName = 'Indonesia';
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`,
        { headers:{ 'Accept-Language':'id','User-Agent':'Moodly-App' } }
      );
      if (r.ok) {
        const d = await r.json();
        const a = d.address || {};
        cityName = a.city || a.town || a.county || a.suburb || a.state || 'Indonesia';
      }
    } catch { /* tetap lanjut */ }
    nearbyState.cityName = cityName;

    // 3. Fetch dari Claude
    const results = await fetchWithClaude(coords, cityName);

    nearbyState.results  = results;
    nearbyState.lastFetch = Date.now();
    nearbyState.loading  = false;
    renderResults(results, nearbyState.filter);

  } catch (err) {
    nearbyState.loading = false;
    console.warn('[nearby] error:', err.message);
    renderError(err.message);
  }
}

/* ════════════════  GEOLOCATION  ════════════════ */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no_geo')); return; }
    navigator.geolocation.getCurrentPosition(
      p  => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      e  => reject(new Error(e.code === 1 ? 'denied' : 'geo_fail')),
      { timeout: 12000, maximumAge: 300000 }
    );
  });
}

/* ════════════════  CLAUDE + WEB SEARCH  ════════════════ */
async function fetchWithClaude(coords, cityName) {
  const prompt = `Kamu membantu pengguna menemukan layanan kesehatan mental di Indonesia.
Pengguna berada di: ${cityName} (lat ${coords.lat.toFixed(3)}, lng ${coords.lng.toFixed(3)}).
Hari ini: ${new Date().toLocaleDateString('id-ID')}.

Gunakan web_search untuk mencari layanan NYATA dan AKTIF:
- "psikolog ${cityName}"
- "klinik kesehatan mental ${cityName}"  
- "layanan konseling online Indonesia"

Buat tepat 8 rekomendasi campuran: psikolog lokal, psikiater/RS, klinik, dan layanan online nasional (Riliv, Into The Light Indonesia, Yayasan Pulih, dll selalu sertakan min 2 online).

KEMBALIKAN HANYA JSON ARRAY, tidak ada teks lain, tidak ada markdown fence:
[{"id":1,"type":"psikolog","name":"Nama Layanan","address":"Alamat lengkap","area":"Kecamatan/Kota","rating":4.5,"reviewCount":120,"phone":"08xxxxxxxxxx","website":"https://...","hours":"09.00-17.00","priceRange":"Rp 200.000-350.000/sesi","tags":["Anxiety","Depresi"],"isOnline":false,"emoji":"🧠","description":"Satu kalimat keunggulan layanan ini."},...]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      model     : 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      tools     : [{ type: 'web_search_20250305', name: 'web_search' }],
      messages  : [{ role: 'user', content: prompt }],
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.warn('[nearby] API error', res.status, errText);
    throw new Error('api_fail');
  }

  const data = await res.json();

  // Ambil semua blok text (bisa ada setelah tool_use selesai)
  const textBlocks = (data.content || []).filter(c => c.type === 'text');
  if (!textBlocks.length) {
    console.warn('[nearby] no text block in response', JSON.stringify(data).slice(0,300));
    throw new Error('no_text');
  }

  const raw = textBlocks.map(c => c.text || '').join('');

  // Cari JSON array di dalam teks (lebih robust)
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn('[nearby] no JSON found in:', raw.slice(0, 400));
    throw new Error('no_json');
  }

  const results = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(results) || results.length === 0) throw new Error('empty_results');
  return results;
}

/* ════════════════  RENDER RESULTS  ════════════════ */
export function renderResults(results, filter) {
  nearbyState.filter = filter;
  const el = document.getElementById('nearby-wrap');
  if (!el) return;

  const list = filter === 'semua' ? results : results.filter(r => r.type === filter);
  const city = nearbyState.cityName || 'Lokasi kamu';

  el.innerHTML = `
    <div class="nb-header">
      <div class="nb-city">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#1db954" stroke-width="2"/>
          <circle cx="12" cy="10" r="3" stroke="#1db954" stroke-width="2"/>
        </svg>
        ${city}
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
      ${FILTER_TYPES.map(f => `
        <button class="nb-ftab ${filter === f.id ? 'on' : ''}"
                onclick="window._filterNearby('${f.id}')">
          ${f.emoji} ${f.label}
        </button>`).join('')}
    </div>

    <div class="nb-count-row">
      <span class="nb-count">${list.length} layanan ditemukan</span>
    </div>

    <div class="nb-list">
      ${list.length
        ? list.map(r => cardHTML(r)).join('')
        : `<div class="nb-empty">Tidak ada layanan untuk kategori ini.</div>`}
    </div>`;
}

/* ════════════════  CARD HTML  ════════════════ */
function cardHTML(r) {
  const labels = { psikolog:'Psikolog', psikiater:'Psikiater', klinik:'Klinik', online:'Online' };
  const stars  = starsHTML(r.rating || 4.0);
  // Escape name untuk onclick attribute
  const safeName = (r.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

  return `<div class="nb-card">
    <div class="nb-card-top">
      <div class="nb-card-emoji">${r.emoji || '🏥'}</div>
      <div class="nb-card-info">
        <div class="nb-card-name">${r.name || '—'}</div>
        <div class="nb-card-area">
          ${r.isOnline
            ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1db954" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="#1db954" stroke-width="2"/></svg> Layanan Online`
            : `<svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#1db954" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="#1db954" stroke-width="2"/></svg> ${r.area || ''}`}
        </div>
        <div class="nb-rating-row">
          ${stars}
          <span class="nb-rating-num">${(r.rating || 4.0).toFixed(1)}</span>
          <span class="nb-review-cnt">(${r.reviewCount || '—'})</span>
        </div>
      </div>
      <span class="nb-badge nb-badge-${r.type || 'klinik'}">${labels[r.type] || r.type}</span>
    </div>

    ${r.description ? `<div class="nb-card-desc">${r.description}</div>` : ''}

    <div class="nb-card-meta">
      <div class="nb-meta-item">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#8aab97" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#8aab97" stroke-width="2" stroke-linecap="round"/></svg>
        ${r.hours || 'Sesuai appointment'}
      </div>
      <div class="nb-meta-item">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><line x1="12" y1="1" x2="12" y2="23" stroke="#8aab97" stroke-width="2"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#8aab97" stroke-width="2" stroke-linecap="round"/></svg>
        ${r.priceRange || 'Hubungi untuk info harga'}
      </div>
    </div>

    ${r.tags?.length ? `<div class="nb-tags">${r.tags.slice(0,3).map(t => `<span class="nb-tag">${t}</span>`).join('')}</div>` : ''}

    <div class="nb-card-actions">
      ${r.phone
        ? `<a class="nb-btn nb-btn-call" href="tel:${r.phone}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.01 2.34 2 2 0 012 .16h3a2 2 0 012 1.72 12.05 12.05 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.05 12.05 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg>
            Hubungi
          </a>` : ''}
      ${r.website
        ? `<a class="nb-btn nb-btn-web" href="${r.website}" target="_blank" rel="noopener">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" stroke-width="2"/></svg>
            Website
          </a>`
        : `<button class="nb-btn nb-btn-web" onclick="window._searchNearby('${safeName}')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>
            Lihat di Maps
          </button>`}
    </div>
  </div>`;
}

/* ════════════════  STARS  ════════════════ */
function starsHTML(rating) {
  const r = Math.round((rating || 0) * 2) / 2;
  let h = '';
  for (let i = 1; i <= 5; i++) {
    const fill   = i <= r ? '#f57c00' : '#e0f0e8';
    const stroke = i <= r ? '#f57c00' : '#c5dfd0';
    h += `<svg width="9" height="9" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="${fill}" stroke="${stroke}" stroke-width="1"/></svg>`;
  }
  return `<div class="nb-stars">${h}</div>`;
}

/* ════════════════  ERROR STATE  ════════════════ */
function renderError(code) {
  const el = document.getElementById('nearby-wrap');
  if (!el) return;

  const msgs = {
    denied     : { ico:'📍', title:'Izin Lokasi Ditolak',      sub:'Aktifkan izin lokasi di pengaturan browser kamu.' },
    no_geo     : { ico:'📱', title:'GPS Tidak Tersedia',        sub:'Browser kamu tidak mendukung geolocation.' },
    geo_fail   : { ico:'🌐', title:'Lokasi Gagal Terdeteksi',   sub:'Pastikan GPS aktif lalu coba lagi.' },
    api_fail   : { ico:'⚠️', title:'Koneksi API Gagal',         sub:'Periksa koneksi internet kamu lalu coba lagi.' },
    no_text    : { ico:'🔄', title:'Respons Kosong',            sub:'API tidak mengembalikan data. Coba lagi.' },
    no_json    : { ico:'🔄', title:'Format Data Tidak Valid',   sub:'Terjadi kesalahan parsing. Coba lagi.' },
    empty_results:{ ico:'🔍', title:'Tidak Ada Hasil',          sub:'Coba perbarui atau periksa koneksi internet.' },
  };
  const m = msgs[code] || { ico:'⚠️', title:'Gagal Memuat', sub:`Terjadi kesalahan (${code}). Coba lagi.` };

  el.innerHTML = `
    <div class="nb-error">
      <div class="nb-error-ico">${m.ico}</div>
      <div class="nb-error-title">${m.title}</div>
      <div class="nb-error-sub">${m.sub}</div>
      <button class="nb-cta" onclick="window._findNearby()">Coba Lagi</button>
    </div>`;
}

/* ════════════════  EXPORTS  ════════════════ */
export function filterNearby(type) {
  nearbyState.filter = type;
  if (nearbyState.results.length) renderResults(nearbyState.results, type);
}

export function refreshNearby() {
  nearbyState.results  = [];
  nearbyState.lastFetch = null;
  findNearby();
}

export function searchNearby(name) {
  const q = encodeURIComponent(name + ' kesehatan mental');
  window.open(`https://maps.google.com/maps?q=${q}`, '_blank');
}