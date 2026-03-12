/* ═══════════════════════════════════════
   MOODLY — nearby.js
   Rekomendasi layanan kesehatan mental & dokter terdekat
   Pakai geolocation + Claude AI + web_search
   ═══════════════════════════════════════ */

/* ════════════════
   STATE
════════════════ */
let nearbyState = {
  loading: false,
  results: [],
  userCoords: null,
  cityName: '',
  lastFetch: null,
  filter: 'semua',
};

const FILTER_TYPES = [
  { id: 'semua',     label: 'Semua',    emoji: '🗺️' },
  { id: 'psikolog',  label: 'Psikolog', emoji: '🧠' },
  { id: 'psikiater', label: 'Psikiater',emoji: '🏥' },
  { id: 'klinik',    label: 'Klinik',   emoji: '🏨' },
  { id: 'online',    label: 'Online',   emoji: '💻' },
];

/* ════════════════
   INIT — dipanggil dari updateHome()
════════════════ */
export function initNearby() {
  renderIdleState();
}

/* ════════════════
   IDLE STATE
════════════════ */
function renderIdleState() {
  const el = document.getElementById('nearby-wrap');
  if (!el) return;

  // Kalau sudah ada results dan belum expired (< 30 menit), reuse
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
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Cari Layanan Terdekat
      </button>
    </div>`;
}

/* ════════════════
   FIND NEARBY — entry point
════════════════ */
export async function findNearby() {
  if (nearbyState.loading) return;
  nearbyState.loading = true;

  const el = document.getElementById('nearby-wrap');
  if (!el) return;

  el.innerHTML = `
    <div class="nb-loading">
      <div class="nb-dots">
        <div class="nb-dot"></div><div class="nb-dot"></div><div class="nb-dot"></div>
      </div>
      <div class="nb-loading-txt">Mencari layanan kesehatan mental terdekat…</div>
    </div>`;

  try {
    const coords = await getUserLocation();
    nearbyState.userCoords = coords;

    // Reverse geocode
    let cityName = 'Indonesia';
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&accept-language=id`,
        { headers: { 'Accept-Language': 'id' } }
      );
      const geoData = await geoRes.json();
      const addr = geoData.address || {};
      cityName = addr.city || addr.town || addr.county || addr.suburb || addr.state || 'Indonesia';
    } catch {}
    nearbyState.cityName = cityName;

    const results = await fetchNearbyWithClaude(coords, cityName);
    nearbyState.results = results;
    nearbyState.lastFetch = Date.now();
    nearbyState.loading = false;

    renderResults(results, nearbyState.filter);
  } catch (err) {
    nearbyState.loading = false;
    renderError(err.message);
  }
}

/* ════════════════
   GEOLOCATION
════════════════ */
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no_geo')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => {
        if (err.code === 1) reject(new Error('denied'));
        else reject(new Error('geo_fail'));
      },
      { timeout: 12000, maximumAge: 300000 }
    );
  });
}

/* ════════════════
   CLAUDE + WEB SEARCH
════════════════ */
async function fetchNearbyWithClaude(coords, cityName) {
  const { lat, lng } = coords;

  const prompt = `Kamu asisten kesehatan mental Indonesia yang membantu pengguna menemukan layanan profesional.
Pengguna berada di: ${cityName} (koordinat: ${lat.toFixed(4)}, ${lng.toFixed(4)})
Tanggal hari ini: ${new Date().toLocaleDateString('id-ID')}.

Gunakan web_search untuk mencari:
1. "psikolog klinik ${cityName} 2024 2025"
2. "psikiater rumah sakit ${cityName}"
3. "layanan konseling online Indonesia terpercaya"

Berikan tepat 8 rekomendasi (mix: 2-3 psikolog lokal, 1-2 psikiater/RS, 1-2 klinik, 2 layanan online nasional seperti Riliv, Into The Light, Yayasan Pulih, Alodokter, Into The Light Indonesia).

Kembalikan HANYA JSON array valid, tanpa markdown, tanpa teks lain:
[{
  "id": 1,
  "type": "psikolog|psikiater|klinik|online",
  "name": "<nama resmi>",
  "address": "<alamat lengkap>",
  "area": "<kelurahan/kecamatan/kota>",
  "rating": <3.5 sampai 5.0>,
  "reviewCount": <50 sampai 500>,
  "phone": "<nomor HP/WA atau null>",
  "website": "<URL atau null>",
  "hours": "<jam operasional>",
  "priceRange": "<kisaran harga per sesi>",
  "tags": ["<spesialisasi>", "<spesialisasi>"],
  "isOnline": <true|false>,
  "emoji": "<1 emoji>",
  "description": "<1 kalimat keunggulan layanan ini>"
}]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 5000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    })
  });

  const data = await res.json();
  const raw = data.content
    .filter(c => c.type === 'text')
    .map(c => c.text || '')
    .join('');

  return JSON.parse(raw.replace(/```json|```/g, '').trim());
}

/* ════════════════
   RENDER RESULTS
════════════════ */
export function renderResults(results, filter) {
  nearbyState.filter = filter;
  const el = document.getElementById('nearby-wrap');
  if (!el) return;

  const filtered = filter === 'semua' ? results : results.filter(r => r.type === filter);
  const city = nearbyState.cityName;

  el.innerHTML = `
    <div class="nb-header">
      <div class="nb-header-left">
        <div class="nb-city">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#1db954" stroke-width="2"/>
            <circle cx="12" cy="10" r="3" stroke="#1db954" stroke-width="2"/>
          </svg>
          ${city}
        </div>
      </div>
      <button class="nb-refresh" onclick="window._refreshNearby()">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" id="nb-rf-ic">
          <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Perbarui
      </button>
    </div>

    <div class="nb-filters" id="nb-filters">
      ${FILTER_TYPES.map(f => `
        <button class="nb-ftab ${filter === f.id ? 'on' : ''}"
                onclick="window._filterNearby('${f.id}')">
          ${f.emoji} ${f.label}
        </button>`).join('')}
    </div>

    <div class="nb-count-row">
      <span class="nb-count">${filtered.length} layanan ditemukan</span>
    </div>

    <div class="nb-list">
      ${filtered.length
        ? filtered.map(r => renderCard(r)).join('')
        : `<div class="nb-empty">Tidak ada layanan untuk kategori ini.</div>`}
    </div>`;
}

/* ════════════════
   RENDER CARD
════════════════ */
function renderCard(r) {
  const typeLabel = { psikolog: 'Psikolog', psikiater: 'Psikiater', klinik: 'Klinik', online: 'Online' };
  const stars = renderStars(r.rating || 4.0);

  return `<div class="nb-card">
    <div class="nb-card-top">
      <div class="nb-card-emoji">${r.emoji || '🏥'}</div>
      <div class="nb-card-info">
        <div class="nb-card-name">${r.name}</div>
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
      <span class="nb-badge nb-badge-${r.type}">${typeLabel[r.type] || r.type}</span>
    </div>

    <div class="nb-card-desc">${r.description || ''}</div>

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
      ${r.phone ? `<a class="nb-btn nb-btn-call" href="tel:${r.phone}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.01 2.34 2 2 0 012 .16h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg>
        Hubungi
      </a>` : ''}
      ${r.website ? `<a class="nb-btn nb-btn-web" href="${r.website}" target="_blank" rel="noopener">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" stroke-width="2"/></svg>
        Website
      </a>` : `<button class="nb-btn nb-btn-web" onclick="window._searchNearby('${encodeURIComponent(r.name)}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>
        Lihat di Maps
      </button>`}
    </div>
  </div>`;
}

/* ════════════════
   STARS
════════════════ */
function renderStars(rating) {
  const r = Math.round((rating || 0) * 2) / 2;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const fill = i <= r ? '#f57c00' : i - 0.5 === r ? 'url(#hg)' : '#e0f0e8';
    const stroke = i <= r || i - 0.5 === r ? '#f57c00' : '#c5dfd0';
    html += `<svg width="9" height="9" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="${fill}" stroke="${stroke}" stroke-width="1"/></svg>`;
  }
  return `<div class="nb-stars">${html}</div>`;
}

/* ════════════════
   ERROR STATE
════════════════ */
function renderError(code) {
  const el = document.getElementById('nearby-wrap');
  if (!el) return;

  const msgs = {
    denied:   { ico: '📍', title: 'Izin Lokasi Ditolak', sub: 'Aktifkan izin lokasi di pengaturan browser kamu.' },
    no_geo:   { ico: '📱', title: 'GPS Tidak Tersedia', sub: 'Browser kamu tidak mendukung geolocation.' },
    geo_fail: { ico: '🌐', title: 'Lokasi Gagal Terdeteksi', sub: 'Pastikan GPS aktif lalu coba lagi.' },
  };
  const m = msgs[code] || { ico: '⚠️', title: 'Gagal Memuat', sub: 'Terjadi kesalahan, coba lagi.' };

  el.innerHTML = `
    <div class="nb-error">
      <div class="nb-error-ico">${m.ico}</div>
      <div class="nb-error-title">${m.title}</div>
      <div class="nb-error-sub">${m.sub}</div>
      <button class="nb-cta" onclick="window._findNearby()">Coba Lagi</button>
    </div>`;
}

/* ════════════════
   EXPORTS
════════════════ */
export function filterNearby(type) {
  nearbyState.filter = type;
  if (nearbyState.results.length) renderResults(nearbyState.results, type);
}

export function refreshNearby() {
  nearbyState.results = [];
  nearbyState.lastFetch = null;
  findNearby();
}

export function searchNearby(encodedName) {
  const q = encodeURIComponent(decodeURIComponent(encodedName) + ' kesehatan mental');
  window.open(`https://maps.google.com/maps?q=${q}`, '_blank');
}