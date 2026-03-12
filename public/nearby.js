/* ═══════════════════════════════════════
   MOODLY — nearby.js  (v10 — GPS + IP Geolocation)
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

// ─── STEP 1: Coba GPS, lalu IP geolocation, lalu fallback ───
async function detectLocation() {
  // A) Coba GPS browser dulu (akurat, butuh izin)
  try {
    const coords = await Promise.race([
      getGPS(),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000))
    ]);
    // Reverse geocode pakai nominatim (gratis, no key)
    const city = await reverseGeocode(coords.lat, coords.lng);
    return { source: 'gps', lat: coords.lat, lng: coords.lng, city };
  } catch (gpsErr) {
    console.log('[nearby] GPS gagal:', gpsErr.message, '→ coba IP geolocation');
  }

  // B) Fallback: IP Geolocation (akurat per kota, tanpa izin user)
  try {
    const ipData = await Promise.race([
      fetch('https://ipapi.co/json/').then(r => r.json()),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000))
    ]);
    if (ipData && ipData.city) {
      return {
        source: 'ip',
        lat: ipData.latitude,
        lng: ipData.longitude,
        city: `${ipData.city}, ${ipData.region}`,
      };
    }
  } catch (ipErr) {
    console.log('[nearby] IP geolocation gagal:', ipErr.message);
  }

  // C) Last resort fallback
  return { source: 'fallback', lat: null, lng: null, city: null };
}

// Reverse geocode koordinat → nama kota (Nominatim OpenStreetMap, gratis)
async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`,
      { headers: { 'User-Agent': 'MoodlyApp/1.0' } }
    );
    const d = await r.json();
    const a = d.address || {};
    // Ambil kota paling spesifik yang tersedia
    const kota = a.city || a.town || a.village || a.county || a.state || 'Indonesia';
    const prov  = a.state || '';
    return prov ? `${kota}, ${prov}` : kota;
  } catch {
    return null;
  }
}

function getGPS() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no_geo')); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      e => reject(new Error('gps_' + e.code)),
      { timeout: 9000, maximumAge: 600000, enableHighAccuracy: false }
    );
  });
}

// ─── STEP 2: Build prompt berdasarkan lokasi yang didapat ───
function buildPrompt(loc, today) {
  let locationCtx;

  if (loc.source === 'gps' && loc.lat) {
    locationCtx = `Koordinat GPS akurat: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)} (${loc.city || 'Indonesia'}). Fokus layanan di kota ini dan sekitarnya.`;
  } else if (loc.source === 'ip' && loc.city) {
    locationCtx = `Lokasi berdasarkan IP: ${loc.city} (lat:${loc.lat?.toFixed(2)}, lng:${loc.lng?.toFixed(2)}). Fokus layanan di ${loc.city} dan sekitarnya.`;
  } else {
    locationCtx = `Lokasi tidak terdeteksi. Berikan layanan nasional Indonesia yang populer, dengan fokus kota-kota besar (Jakarta, Surabaya, Bandung).`;
  }

  return `Kamu asisten kesehatan mental Indonesia. Tanggal: ${today}. ${locationCtx}

Gunakan web_search untuk mencari layanan kesehatan mental NYATA dan AKTIF di lokasi tersebut.
Cari: "psikolog ${loc.city || 'Jakarta'}", "klinik kesehatan mental ${loc.city || 'Jakarta'}", "psikiater ${loc.city || 'Jakarta'}"

Berikan tepat 8 rekomendasi: campuran psikolog lokal, psikiater/RS, klinik, dan min 2 layanan online nasional (Riliv, Into The Light Indonesia, Yayasan Pulih, Sejiwa).

Kembalikan HANYA JSON ini, tanpa teks lain, tanpa markdown, tanpa komentar:
{"city":"<nama kota>","items":[{"id":1,"type":"psikolog","name":"<nama lengkap>","address":"<alamat lengkap>","area":"<kota/kabupaten>","rating":4.5,"reviewCount":120,"phone":"<nomor atau null>","website":"<url atau null>","hours":"<jam buka>","priceRange":"<kisaran harga>","tags":["<tag1>","<tag2>"],"isOnline":false,"emoji":"🧠","description":"<1 kalimat keunggulan spesifik>"}]}`;
}

// ─── MAIN findNearby ───
export async function findNearby() {
  if (nb.loading) return;
  nb.loading = true;

  const el = document.getElementById('nearby-wrap');
  if (!el) { nb.loading = false; return; }

  const setStatus = t => { const s = document.getElementById('nb-status'); if (s) s.textContent = t; };

  el.innerHTML = `
    <div class="nb-loading">
      <div class="nb-dots"><div class="nb-dot"></div><div class="nb-dot"></div><div class="nb-dot"></div></div>
      <div class="nb-loading-txt" id="nb-status">Mendeteksi lokasi…</div>
    </div>`;

  // Deteksi lokasi (GPS → IP → fallback)
  const loc = await detectLocation();

  const sourceLabel = {
    gps     : `📍 GPS: ${loc.city || 'Terdeteksi'}`,
    ip      : `🌐 IP: ${loc.city || 'Terdeteksi'}`,
    fallback: '🗺️ Layanan Nasional',
  };
  setStatus(sourceLabel[loc.source] + ' · Mencari layanan…');

  const today = new Date().toLocaleDateString('id-ID', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });

  try {
    const res = await fetch('/api/anthropic', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({
        model     : 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        tools     : [{ type: 'web_search_20250305', name: 'web_search' }],
        messages  : [{ role: 'user', content: buildPrompt(loc, today) }],
      })
    });

    if (!res.ok) throw new Error('http_' + res.status);

    const data  = await res.json();
    const raw   = (data.content || []).filter(c => c.type === 'text').map(c => c.text || '').join('');
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no_json');

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.items) || !parsed.items.length) throw new Error('empty');

    nb.results   = parsed.items;
    nb.cityName  = parsed.city || loc.city || 'Indonesia';
    nb.lastFetch = Date.now();
    nb.loading   = false;
    renderResults(nb.results, nb.filter);

  } catch (e) {
    nb.loading = false;
    console.warn('[nearby] error:', e.message);
    // Fallback dengan data minimal daripada array kosong
    nb.results   = fallbackServices(loc.city);
    nb.cityName  = loc.city || 'Indonesia';
    nb.lastFetch = Date.now();
    renderResults(nb.results, nb.filter);
  }
}

// ─── Fallback data (tampil kalau API error) ───
function fallbackServices(city) {
  return [
    {
      id:1, type:'online', name:'Into The Light Indonesia',
      address:'Layanan online nasional', area:'Online',
      rating:4.8, reviewCount:2100, phone:'119', website:'https://www.intothelightid.org',
      hours:'Senin–Jumat 09.00–17.00', priceRange:'Gratis',
      tags:['Pencegahan Bunuh Diri','Konseling','Hotline'],
      isOnline:true, emoji:'💚',
      description:'Organisasi nasional fokus kesehatan mental & pencegahan bunuh diri.'
    },
    {
      id:2, type:'online', name:'Riliv – Konsultasi Psikologi',
      address:'Layanan online nasional', area:'Online',
      rating:4.6, reviewCount:18000, phone:null, website:'https://riliv.co',
      hours:'24 Jam', priceRange:'Rp 150.000–300.000/sesi',
      tags:['Online','Meditasi','Chat dengan Psikolog'],
      isOnline:true, emoji:'💻',
      description:'Platform kesehatan mental terbesar Indonesia dengan ratusan psikolog berlisensi.'
    },
    {
      id:3, type:'online', name:'Yayasan Pulih',
      address:'Jl. Teluk Peleng No.63A, Jakarta', area:'Jakarta',
      rating:4.7, reviewCount:540, phone:'(021) 788-42580', website:'https://yayasanpulih.org',
      hours:'Senin–Jumat 08.00–17.00', priceRange:'Sesuai kemampuan',
      tags:['Trauma','Komunitas','Konseling Keluarga'],
      isOnline:false, emoji:'🧡',
      description:'Layanan psikologi berbasis komunitas dengan tarif sliding scale sejak 2000.'
    },
  ];
}

// ─── Render & UI (tidak berubah dari v9) ───
export function renderResults(results, filter) {
  nb.filter = filter;
  const el  = document.getElementById('nearby-wrap');
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
        <button class="nb-ftab ${filter === f.id ? 'on' : ''}" onclick="window._filterNearby('${f.id}')">
          ${f.emoji} ${f.label}
        </button>`).join('')}
    </div>
    <div class="nb-count-row"><span class="nb-count">${list.length} layanan ditemukan</span></div>
    <div class="nb-list">
      ${list.length ? list.map(cardHTML).join('') : `<div class="nb-empty">Tidak ada layanan untuk kategori ini.</div>`}
    </div>`;
}

function cardHTML(r) {
  const labels = { psikolog:'Psikolog', psikiater:'Psikiater', klinik:'Klinik', online:'Online' };
  const safe   = (r.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  return `<div class="nb-card">
    <div class="nb-card-top">
      <div class="nb-card-emoji">${r.emoji || '🏥'}</div>
      <div class="nb-card-info">
        <div class="nb-card-name">${r.name || '—'}</div>
        <div class="nb-card-area">${r.isOnline
          ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1db954" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="#1db954" stroke-width="2"/></svg> Layanan Online`
          : `<svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#1db954" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="#1db954" stroke-width="2"/></svg> ${r.area || ''}`}
        </div>
        <div class="nb-rating-row">
          ${starsHTML(r.rating || 4.0)}
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
      ${r.phone ? `<a class="nb-btn nb-btn-call" href="tel:${r.phone}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.01 2.34 2 2 0 012 .16h3a2 2 0 012 1.72 12.05 12.05 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.05 12.05 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg> Hubungi</a>` : ''}
      ${r.website
        ? `<a class="nb-btn nb-btn-web" href="${r.website}" target="_blank" rel="noopener"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" stroke-width="2"/></svg> Website</a>`
        : `<button class="nb-btn nb-btn-web" onclick="window._searchNearby('${safe}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg> Lihat di Maps</button>`}
    </div>
  </div>`;
}

function starsHTML(rating) {
  const r = Math.round((rating || 0) * 2) / 2;
  let h = '';
  for (let i = 1; i <= 5; i++) {
    const on = i <= r;
    h += `<svg width="9" height="9" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="${on?'#f57c00':'#e0f0e8'}" stroke="${on?'#f57c00':'#c5dfd0'}" stroke-width="1"/></svg>`;
  }
  return `<div class="nb-stars">${h}</div>`;
}

export function filterNearby(t) { nb.filter = t; if (nb.results.length) renderResults(nb.results, t); }
export function refreshNearby() { nb.results = []; nb.lastFetch = null; findNearby(); }
export function searchNearby(name) { window.open(`https://maps.google.com/maps?q=${encodeURIComponent(name + ' kesehatan mental')}`, '_blank'); }