/* ═══════════════════════════════════════
   MOODLY — nearby.js  (v3 — no backend, fix cache)
═══════════════════════════════════════ */

let nb = {
  loading  : false,
  results  : [],
  cityName : '',
  lastFetch: null,
  filter   : 'semua',
  loc      : null,
};

const FILTERS = [
  { id:'semua',     label:'Semua',    emoji:'🗺️' },
  { id:'psikolog',  label:'Psikolog', emoji:'🧠' },
  { id:'psikiater', label:'Psikiater',emoji:'🏥' },
  { id:'klinik',    label:'Klinik',   emoji:'🏨' },
  { id:'online',    label:'Online',   emoji:'💻' },
];

/* ─── Deteksi Lokasi ─── */
async function detectLocation() {
  // Reuse lokasi kalau sudah ada
  if (nb.loc) return nb.loc;

  try {
    const coords = await Promise.race([
      getGPS(),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000))
    ]);
    const city = await reverseGeocode(coords.lat, coords.lng);
    nb.loc = { source: 'gps', lat: coords.lat, lng: coords.lng, city };
    return nb.loc;
  } catch {
    console.log('[nearby] GPS gagal → IP geolocation');
  }

  try {
    const ip = await Promise.race([
      fetch('https://ipapi.co/json/').then(r => r.json()),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000))
    ]);
    if (ip?.city) {
      nb.loc = { source: 'ip', lat: ip.latitude, lng: ip.longitude, city: `${ip.city}, ${ip.region}` };
      return nb.loc;
    }
  } catch {
    console.log('[nearby] IP geolocation gagal → default Jakarta');
  }

  nb.loc = { source: 'fallback', lat: -6.2088, lng: 106.8456, city: 'Jakarta' };
  return nb.loc;
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

async function reverseGeocode(lat, lng) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`,
      { headers: { 'User-Agent': 'MoodlyApp/1.0' } }
    );
    const d = await r.json();
    const a = d.address || {};
    const kota = a.city || a.town || a.village || a.county || a.state || 'Indonesia';
    return a.state ? `${kota}, ${a.state}` : kota;
  } catch { return null; }
}

/* ─── Fetch Overpass langsung (no backend needed) ─── */
async function fetchOverpass(lat, lng) {
  const radius = 15000; // 15km
  const q = `
    [out:json][timeout:20];
    (
      node["healthcare"="psychologist"](around:${radius},${lat},${lng});
      node["healthcare"="psychiatrist"](around:${radius},${lat},${lng});
      node["amenity"~"clinic|hospital"]["name"~"jiwa|mental|psikolog|psikiater",i](around:${radius},${lat},${lng});
      way["amenity"~"clinic|hospital"]["name"~"jiwa|mental|psikolog|psikiater",i](around:${radius},${lat},${lng});
    );
    out body center 15;
  `;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method : 'POST',
    body   : 'data=' + encodeURIComponent(q),
  });
  if (!res.ok) throw new Error('overpass_' + res.status);
  const data = await res.json();
  return data.elements || [];
}

/* ─── Konversi OSM → kartu ─── */
function osmToCard(el, idx) {
  const tags = el.tags || {};
  const name = tags.name || tags['name:id'] || '—';
  const nm   = name.toLowerCase();
  const hc   = (tags['healthcare'] || '').toLowerCase();

  let type = 'klinik';
  if (hc === 'psychiatrist' || nm.includes('psikiater') || nm.includes('jiwa')) type = 'psikiater';
  else if (hc === 'psychologist' || nm.includes('psikolog')) type = 'psikolog';
  else if (tags.amenity === 'hospital') type = 'psikiater';

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;

  return {
    id         : idx + 1,
    type,
    name,
    address    : [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(', ') || 'Lihat di Maps',
    area       : tags['addr:city'] || tags['addr:suburb'] || '',
    rating     : null,
    reviewCount: 0,
    phone      : tags.phone || tags['contact:phone'] || null,
    website    : tags.website || tags['contact:website'] || null,
    hours      : tags.opening_hours?.replace(/;/g, ' | ') || 'Sesuai appointment',
    priceRange : 'Hubungi untuk info harga',
    tags       : [tags.amenity, tags.healthcare, tags['healthcare:speciality']].filter(Boolean).map(t => t.replace(/_/g, ' ')),
    isOnline   : false,
    emoji      : { psikolog:'🧠', psikiater:'🏥', klinik:'🏨' }[type] || '🏥',
    description: tags.description || null,
    mapsUrl    : lat ? `https://www.google.com/maps?q=${lat},${lng}` : null,
  };
}

/* ─── Layanan online nasional ─── */
function onlineNational() {
  return [
    { id:9001, type:'online', name:'Into The Light Indonesia', address:'Layanan online nasional', area:'Online', rating:4.8, reviewCount:2100, phone:'119', website:'https://www.intothelightid.org', hours:'Senin–Jumat 09.00–17.00', priceRange:'Gratis', tags:['Hotline','Konseling'], isOnline:true, emoji:'💚', description:'Hotline nasional pencegahan bunuh diri.', mapsUrl:null },
    { id:9002, type:'online', name:'Riliv – Konsultasi Psikologi', address:'Layanan online nasional', area:'Online', rating:4.6, reviewCount:18000, phone:null, website:'https://riliv.co', hours:'24 Jam', priceRange:'Rp 150.000–300.000/sesi', tags:['Online','Chat Psikolog'], isOnline:true, emoji:'💻', description:'Platform kesehatan mental terbesar Indonesia.', mapsUrl:null },
    { id:9003, type:'online', name:'Yayasan Pulih', address:'Jl. Teluk Peleng No.63A, Jakarta Pusat', area:'Jakarta', rating:4.7, reviewCount:540, phone:'(021) 788-42580', website:'https://yayasanpulih.org', hours:'Senin–Jumat 08.00–17.00', priceRange:'Sesuai kemampuan', tags:['Trauma','Komunitas'], isOnline:false, emoji:'🧡', description:'Konseling berbasis komunitas, tarif sliding scale.', mapsUrl:'https://maps.google.com/?q=Yayasan+Pulih+Jakarta' },
    { id:9004, type:'online', name:'Sejiwa (119 ext 8)', address:'Layanan online nasional', area:'Online', rating:4.5, reviewCount:800, phone:'119', website:'https://sejiwa.org', hours:'24 Jam', priceRange:'Gratis', tags:['Hotline','Krisis'], isOnline:true, emoji:'📞', description:'Hotline kesehatan jiwa nasional gratis 24 jam.', mapsUrl:null },
  ];
}

/* ─── Main findNearby ─── */
export async function findNearby() {
  if (nb.loading) return;

  // ✅ Cek cache — kalau hasil sudah ada dan < 30 menit, langsung render
  if (nb.results.length && nb.lastFetch && (Date.now() - nb.lastFetch) < 30 * 60 * 1000) {
    renderResults(nb.results, nb.filter);
    return;
  }

  nb.loading = true;
  const el = document.getElementById('nearby-wrap');
  if (!el) { nb.loading = false; return; }

  const setStatus = t => { const s = document.getElementById('nb-status'); if (s) s.textContent = t; };

  el.innerHTML = `
    <div class="nb-loading">
      <div class="nb-dots"><div class="nb-dot"></div><div class="nb-dot"></div><div class="nb-dot"></div></div>
      <div class="nb-loading-txt" id="nb-status">Mendeteksi lokasi…</div>
    </div>`;

  const loc = await detectLocation();
  setStatus(`${loc.source === 'gps' ? '📍' : '🌐'} ${loc.city || 'Terdeteksi'} · Mencari layanan…`);

  try {
    const elements = await fetchOverpass(loc.lat, loc.lng);
    console.log('[nearby] OSM hasil:', elements.length);

    const seen  = new Set();
    const cards = elements
      .filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; })
      .map(osmToCard);

    nb.results   = [...cards, ...onlineNational()];
    nb.cityName  = loc.city || 'Area kamu';
    nb.lastFetch = Date.now(); // ✅ Set timestamp cache
    nb.loading   = false;
    renderResults(nb.results, nb.filter);

  } catch (e) {
    nb.loading   = false;
    console.warn('[nearby] error:', e.message);
    nb.results   = onlineNational();
    nb.cityName  = loc.city || 'Indonesia';
    nb.lastFetch = Date.now(); // ✅ Cache fallback juga
    renderResults(nb.results, nb.filter);
  }
}

/* ─── Render UI ─── */
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
    <div class="nb-count-row">
      <span class="nb-count">${list.length} layanan ditemukan</span>
    </div>
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
          ${r.rating
            ? `${starsHTML(r.rating)}<span class="nb-rating-num">${r.rating.toFixed(1)}</span><span class="nb-review-cnt">(${r.reviewCount?.toLocaleString('id')})</span>`
            : '<span style="font-size:10px;color:#8aab97">Data OpenStreetMap</span>'}
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
      ${r.website ? `<a class="nb-btn nb-btn-web" href="${r.website}" target="_blank" rel="noopener"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" stroke-width="2"/></svg> Website</a>` : ''}
      ${r.mapsUrl
        ? `<a class="nb-btn nb-btn-maps" href="${r.mapsUrl}" target="_blank" rel="noopener"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg> Maps</a>`
        : `<button class="nb-btn nb-btn-maps" onclick="window._searchNearby('${safe}')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg> Cari di Maps</button>`}
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

/* ─── Exports ─── */
export function initNearby() {
  const el = document.getElementById('nearby-wrap');
  if (!el) return;

  // ✅ Kalau cache masih valid, langsung render — jangan fetch ulang
  if (nb.results.length && nb.lastFetch && (Date.now() - nb.lastFetch) < 30 * 60 * 1000) {
    renderResults(nb.results, nb.filter);
    return;
  }

  // Belum ada data → tampilkan tombol
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

export function filterNearby(t)    { nb.filter = t; if (nb.results.length) renderResults(nb.results, t); }
export function refreshNearby()    { nb.results = []; nb.lastFetch = null; nb.loc = null; findNearby(); }
export function searchNearby(name) { window.open(`https://maps.google.com/maps?q=${encodeURIComponent(name + ' kesehatan mental')}`, '_blank'); }