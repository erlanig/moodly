/* ═══════════════════════════════════════
   MOODLY — nearby.js  (v4)
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

/* ─── Kata kunci BLACKLIST — skip kalau nama mengandung ini ─── */
const BLACKLIST = [
  'puskesmas','posyandu','pustu','polindes','bidan','bkia',
  'gigi','dental','mata','optik','kacamata',
  'kandungan','kebidanan','obgyn','bersalin','melahirkan',
  'hewan','veteriner','apotek','apotik','farmasi','laboratori',
  'radiologi','fisioterapi','akupunktur','herbal','kecantikan',
  'kosmetik','spa','salon','panti','posyandu','tb','tbc',
  'paru','jantung','bedah','ortopedi','tulang','ginjal',
  'kulit','kelamin','tht','telinga','hidung',
];

/* ─── Kata kunci WHITELIST — prioritas tinggi ─── */
const WHITELIST_HIGH = [
  'psikiater','psikiatri','psychiatry','psychiatric',
  'psikolog','psikologi','psychology','psychologist',
  'jiwa','mental health','kesehatan jiwa','kesehatan mental',
  'into the light','yayasan pulih','riliv','sejiwa',
];

const WHITELIST_MED = [
  'rumah sakit','rs ','rsia ','rsud','rsup','rskj',
  'hospital','klinik utama','klinik pratama',
  'neurologi','syaraf','neurology',
];

/* ─── Cek apakah elemen OSM layak ditampilkan ─── */
function isRelevant(el) {
  const tags = el.tags || {};
  const name = (
    (tags.name || '') + ' ' +
    (tags['name:id'] || '') + ' ' +
    (tags.description || '') + ' ' +
    (tags['healthcare:speciality'] || '') + ' ' +
    (tags.healthcare || '')
  ).toLowerCase();

  // Langsung lolos kalau ada tag healthcare eksplisit mental health
  const hc   = (tags.healthcare || '').toLowerCase();
  const spec = (tags['healthcare:speciality'] || '').toLowerCase();
  if (
    hc === 'psychologist' || hc === 'psychiatrist' ||
    spec.includes('psychiatry') || spec.includes('psychology') ||
    spec.includes('mental')
  ) return { pass: true, priority: 1 };

  // Lolos kalau nama whitelist tinggi
  if (WHITELIST_HIGH.some(w => name.includes(w))) return { pass: true, priority: 1 };

  // Blacklist — langsung buang
  if (BLACKLIST.some(b => name.includes(b))) return { pass: false };

  // RS umum & klinik utama — boleh masuk (mungkin punya poli jiwa)
  if (WHITELIST_MED.some(w => name.includes(w))) return { pass: true, priority: 2 };

  // Hospital tag tapi nama tidak ada di blacklist → boleh
  if (tags.amenity === 'hospital') return { pass: true, priority: 2 };

  // Klinik umum tanpa spesialisasi jelas → buang (terlalu noise)
  return { pass: false };
}

function classifyType(el) {
  const tags = el.tags || {};
  const name = (tags.name || tags['name:id'] || '').toLowerCase();
  const hc   = (tags.healthcare || '').toLowerCase();
  const spec = (tags['healthcare:speciality'] || '').toLowerCase();

  if (
    hc === 'psychiatrist' || spec.includes('psychiatry') ||
    name.includes('psikiater') || name.includes('jiwa') ||
    tags.amenity === 'hospital'
  ) return 'psikiater';

  if (
    hc === 'psychologist' || spec.includes('psychology') ||
    name.includes('psikolog')
  ) return 'psikolog';

  return 'klinik';
}

function osmToCard(el, idx, priority) {
  const tags  = el.tags || {};
  const name  = tags.name || tags['name:id'] || tags['name:en'] || '—';
  const type  = classifyType(el);
  const lat   = el.lat ?? el.center?.lat;
  const lng   = el.lon ?? el.center?.lon;

  // Susun alamat selengkap mungkin
  const addrParts = [
    tags['addr:street'] && tags['addr:housenumber']
      ? `${tags['addr:street']} No.${tags['addr:housenumber']}`
      : tags['addr:street'],
    tags['addr:suburb'] || tags['addr:village'],
    tags['addr:district'] || tags['addr:subdistrict'],
    tags['addr:city'] || tags['addr:regency'],
    tags['addr:province'],
    tags['addr:postcode'] ? `(${tags['addr:postcode']})` : null,
  ].filter(Boolean);

  const address = addrParts.length ? addrParts.join(', ') : null;
  const area    = tags['addr:city'] || tags['addr:regency'] || tags['addr:suburb'] || tags['addr:district'] || '';

  // Telepon — kumpulkan semua kemungkinan field
  const phones = [
    tags.phone, tags['phone:id'], tags['contact:phone'],
    tags['contact:mobile'], tags.mobile, tags['phone:2'],
  ].filter(Boolean);
  const phone = phones.length ? phones[0] : null;

  // Website
  const website = tags.website || tags['contact:website'] ||
                  tags['contact:facebook'] || tags.url || null;

  // Email
  const email = tags.email || tags['contact:email'] || null;

  // Jam buka — format lebih rapi
  let hours = 'Sesuai appointment';
  if (tags.opening_hours) {
    hours = tags.opening_hours
      .replace(/Mo/g,'Sen').replace(/Tu/g,'Sel').replace(/We/g,'Rab')
      .replace(/Th/g,'Kam').replace(/Fr/g,'Jum').replace(/Sa/g,'Sab')
      .replace(/Su/g,'Min').replace(/;/g,' | ').replace(/,/g,', ');
  }

  // Tags relevan untuk ditampilkan
  const displayTags = [
    tags['healthcare:speciality'],
    tags.healthcare,
    tags.amenity,
    tags['social_facility'],
    tags.operator ? `Operator: ${tags.operator}` : null,
  ].filter(Boolean).map(t => t.replace(/_/g, ' '));

  // Google Maps URL — pakai koordinat kalau ada, nama kalau tidak
  const mapsUrl = lat && lng
    ? `https://www.google.com/maps?q=${lat},${lng}&z=17`
    : `https://maps.google.com/?q=${encodeURIComponent(name + ' ' + area)}`;

  const emojiMap = { psikolog:'🧠', psikiater:'🏥', klinik:'🏨' };

  return {
    id         : `osm_${el.id}`,
    type,
    name,
    address    : address || 'Lihat di Maps',
    area,
    rating     : null,
    reviewCount: 0,
    phone,
    phones,      // semua nomor
    website,
    email,
    hours,
    priceRange : tags.fee === 'no' ? 'Gratis' : (tags['charge'] || 'Hubungi untuk info harga'),
    tags       : displayTags.slice(0, 4),
    isOnline   : false,
    emoji      : emojiMap[type] || '🏥',
    description: tags.description || tags['description:id'] || null,
    mapsUrl,
    priority,
    source     : 'osm',
  };
}

/* ─── Fetch Overpass ─── */
async function fetchOverpass(lat, lng) {
  const radius = 10000;
  const q = `
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:${radius},${lat},${lng});
      way["amenity"="hospital"](around:${radius},${lat},${lng});
      node["amenity"="clinic"](around:${radius},${lat},${lng});
      way["amenity"="clinic"](around:${radius},${lat},${lng});
      node["healthcare"="psychologist"](around:${radius},${lat},${lng});
      node["healthcare"="psychiatrist"](around:${radius},${lat},${lng});
      node["healthcare"="doctor"]["healthcare:speciality"~"psychiatry|psychology|mental",i](around:${radius},${lat},${lng});
    );
    out body center 30;
  `;

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method : 'POST',
    body   : 'data=' + encodeURIComponent(q),
  });
  if (!res.ok) throw new Error('overpass_' + res.status);
  const data = await res.json();
  return data.elements || [];
}

/* ─── Deteksi Lokasi ─── */
async function detectLocation() {
  if (nb.loc) return nb.loc;

  try {
    const coords = await Promise.race([
      getGPS(),
      new Promise((_, r) => setTimeout(() => r(new Error('t')), 10000))
    ]);
    const city = await reverseGeocode(coords.lat, coords.lng);
    nb.loc = { source:'gps', lat:coords.lat, lng:coords.lng, city };
    return nb.loc;
  } catch { console.log('[nearby] GPS gagal → IP'); }

  try {
    const ip = await Promise.race([
      fetch('https://ipapi.co/json/').then(r => r.json()),
      new Promise((_, r) => setTimeout(() => r(new Error('t')), 5000))
    ]);
    if (ip?.city) {
      nb.loc = { source:'ip', lat:ip.latitude, lng:ip.longitude, city:`${ip.city}, ${ip.region}` };
      return nb.loc;
    }
  } catch { console.log('[nearby] IP gagal → default'); }

  nb.loc = { source:'fallback', lat:-6.2088, lng:106.8456, city:'Jakarta' };
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

/* ─── Layanan online nasional ─── */
function onlineNational() {
  return [
    { id:'on_1', type:'online', name:'Into The Light Indonesia', address:'Layanan online nasional', area:'Online', rating:4.8, reviewCount:2100, phone:'119', phones:['119'], website:'https://www.intothelightid.org', email:'info@intothelightid.org', hours:'Senin–Jumat 09.00–17.00', priceRange:'Gratis', tags:['Hotline','Konseling','Pencegahan Bunuh Diri'], isOnline:true, emoji:'💚', description:'Hotline & konseling nasional, fokus pencegahan bunuh diri.', mapsUrl:null, priority:0, source:'static' },
    { id:'on_2', type:'online', name:'Riliv – Konsultasi Psikologi', address:'Layanan online nasional', area:'Online', rating:4.6, reviewCount:18000, phone:null, phones:[], website:'https://riliv.co', email:null, hours:'24 Jam', priceRange:'Rp 150.000–300.000/sesi', tags:['Online','Chat Psikolog','Meditasi'], isOnline:true, emoji:'💻', description:'Platform kesehatan mental terbesar Indonesia dengan ratusan psikolog berlisensi.', mapsUrl:null, priority:0, source:'static' },
    { id:'on_3', type:'online', name:'Yayasan Pulih', address:'Jl. Teluk Peleng No.63A, Jakarta Pusat', area:'Jakarta', rating:4.7, reviewCount:540, phone:'(021) 788-42580', phones:['(021) 788-42580'], website:'https://yayasanpulih.org', email:'yayasanpulih@cbn.net.id', hours:'Senin–Jumat 08.00–17.00', priceRange:'Sesuai kemampuan', tags:['Trauma','Komunitas','Sliding Scale'], isOnline:false, emoji:'🧡', description:'Konseling berbasis komunitas dengan tarif sliding scale sejak 2000.', mapsUrl:'https://maps.google.com/?q=Yayasan+Pulih+Jakarta', priority:0, source:'static' },
    { id:'on_4', type:'online', name:'Sejiwa (119 ext 8)', address:'Layanan online nasional', area:'Online', rating:4.5, reviewCount:800, phone:'119', phones:['119'], website:'https://sejiwa.org', email:null, hours:'24 Jam', priceRange:'Gratis', tags:['Hotline','Krisis','Anak & Remaja'], isOnline:true, emoji:'📞', description:'Hotline kesehatan jiwa nasional gratis 24 jam.', mapsUrl:null, priority:0, source:'static' },
    { id:'on_5', type:'online', name:'Into The Light – Chat Konseling', address:'Layanan online nasional', area:'Online', rating:4.7, reviewCount:1200, phone:null, phones:[], website:'https://www.into-the-light.org', email:null, hours:'24 Jam', priceRange:'Gratis', tags:['Chat','Online','Anonim'], isOnline:true, emoji:'🌙', description:'Konseling chat anonim gratis untuk krisis mental.', mapsUrl:null, priority:0, source:'static' },
  ];
}

/* ─── Main findNearby ─── */
export async function findNearby() {
  if (nb.loading) return;
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
    console.log('[nearby] OSM raw:', elements.length);

    const seen  = new Set();
    const cards = [];

    for (const el of elements) {
      if (!el.tags?.name)       continue; // skip tanpa nama
      if (seen.has(el.id))      continue; // skip duplikat
      seen.add(el.id);

      const check = isRelevant(el);
      if (!check.pass)          continue; // skip blacklist / tidak relevan

      cards.push(osmToCard(el, cards.length, check.priority));
    }

    // Urutkan: priority 1 (mental health eksplisit) → priority 2 (RS umum)
    cards.sort((a, b) => a.priority - b.priority);

    console.log('[nearby] OSM setelah filter:', cards.length);

    // Kalau ada data OSM → tampilkan OSM + online nasional
    // Kalau tidak ada → hanya online nasional (tidak campur fallback palsu)
    const online  = onlineNational();
    nb.results    = cards.length ? [...online, ...cards] : online;
    nb.cityName   = loc.city || 'Area kamu';
    nb.lastFetch  = Date.now();
    nb.loading    = false;
    renderResults(nb.results, nb.filter);

  } catch (e) {
    nb.loading   = false;
    console.warn('[nearby] error:', e.message);
    // Error → hanya tampilkan layanan online, jangan data palsu
    nb.results   = onlineNational();
    nb.cityName  = loc.city || 'Indonesia';
    nb.lastFetch = Date.now();
    renderResults(nb.results, nb.filter);
  }
}

/* ─── Render UI ─── */
export function renderResults(results, filter) {
  nb.filter = filter;
  const wrap = document.getElementById('nearby-wrap');
  if (!wrap) return;
  const list = filter === 'semua' ? results : results.filter(r => r.type === filter);

  const osmCount    = results.filter(r => r.source === 'osm').length;
  const hasRealData = osmCount > 0;

  wrap.innerHTML = `
    <div class="nb-header">
      <div class="nb-city">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#1db954" stroke-width="2"/>
          <circle cx="12" cy="10" r="3" stroke="#1db954" stroke-width="2"/>
        </svg>
        ${nb.cityName}
        ${hasRealData ? `<span style="font-size:9px;color:#8aab97;margin-left:4px">${osmCount} dari OpenStreetMap</span>` : ''}
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
      ${list.length ? list.map(cardHTML).join('') : `<div class="nb-empty">Tidak ada layanan untuk kategori ini di area ini.</div>`}
    </div>`;
}

function cardHTML(r) {
  const labels   = { psikolog:'Psikolog', psikiater:'Psikiater', klinik:'Klinik', online:'Online' };
  const safe     = (r.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const isStatic = r.source === 'static';

  // Badge tambahan untuk RS
  const extraBadge = r.type === 'psikiater' && !r.isOnline
    ? `<span style="font-size:9px;background:#e8f5e9;color:#2e7d32;padding:2px 6px;border-radius:8px;margin-left:4px">Poli Jiwa</span>`
    : '';

  return `<div class="nb-card ${r.priority === 1 ? 'nb-card-featured' : ''}">
    <div class="nb-card-top">
      <div class="nb-card-emoji">${r.emoji || '🏥'}</div>
      <div class="nb-card-info">
        <div class="nb-card-name">${r.name || '—'}${extraBadge}</div>
        <div class="nb-card-area">${r.isOnline
          ? `<svg width="9" height="9" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1db954" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="#1db954" stroke-width="2"/></svg> Layanan Online`
          : `<svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#1db954" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="#1db954" stroke-width="2"/></svg> ${r.area || ''}`}
        </div>
        <div class="nb-rating-row">
          ${r.rating
            ? `${starsHTML(r.rating)}<span class="nb-rating-num">${r.rating.toFixed(1)}</span><span class="nb-review-cnt">(${r.reviewCount?.toLocaleString('id')})</span>`
            : isStatic
              ? starsHTML(r.rating || 4.5)
              : '<span style="font-size:9px;color:#8aab97">📍 Data peta</span>'}
        </div>
      </div>
      <span class="nb-badge nb-badge-${r.type || 'klinik'}">${labels[r.type] || r.type}</span>
    </div>

    ${r.description ? `<div class="nb-card-desc">${r.description}</div>` : ''}

    ${!r.isOnline && r.address !== 'Lihat di Maps' ? `
    <div class="nb-card-address">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#8aab97" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="#8aab97" stroke-width="2"/></svg>
      ${r.address}
    </div>` : ''}

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

    ${r.email ? `
    <div class="nb-card-email">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#8aab97" stroke-width="2"/><polyline points="22,6 12,13 2,6" stroke="#8aab97" stroke-width="2"/></svg>
      <a href="mailto:${r.email}" style="color:#8aab97;font-size:10px">${r.email}</a>
    </div>` : ''}

    ${r.tags?.length ? `<div class="nb-tags">${r.tags.slice(0,4).map(t => `<span class="nb-tag">${t}</span>`).join('')}</div>` : ''}

    <div class="nb-card-actions">
      ${r.phones?.length
        ? r.phones.slice(0,2).map(p =>
            `<a class="nb-btn nb-btn-call" href="tel:${p.replace(/\s/g,'')}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.01 2.34 2 2 0 012 .16h3a2 2 0 012 1.72 12.05 12.05 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.05 12.05 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg>
              ${p}
            </a>`
          ).join('')
        : ''}
      ${r.website
        ? `<a class="nb-btn nb-btn-web" href="${r.website}" target="_blank" rel="noopener">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" stroke-width="2"/></svg>
            Website
           </a>`
        : ''}
      ${r.mapsUrl
        ? `<a class="nb-btn nb-btn-maps" href="${r.mapsUrl}" target="_blank" rel="noopener">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>
            Maps
           </a>`
        : `<button class="nb-btn nb-btn-maps" onclick="window._searchNearby('${safe}')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>
            Cari di Maps
           </button>`}
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
  if (nb.results.length && nb.lastFetch && (Date.now() - nb.lastFetch) < 30 * 60 * 1000) {
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

export function filterNearby(t)    { nb.filter = t; if (nb.results.length) renderResults(nb.results, t); }
export function refreshNearby()    { nb.results = []; nb.lastFetch = null; nb.loc = null; findNearby(); }
export function searchNearby(name) { window.open(`https://maps.google.com/maps?q=${encodeURIComponent(name + ' kesehatan mental')}`, '_blank'); }