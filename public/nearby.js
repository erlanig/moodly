/* ═══════════════════════════════════════
   MOODLY — nearby.js  (v10 — query dari Firestore CSV data)
   Data 4000 layanan dari mh_ind.csv sudah di Firestore.
   Pencarian: GPS → cari kabupaten/kota terdekat → query Firestore
═══════════════════════════════════════ */

import { db } from '../firebase.js';
import {
  collection, query, where, orderBy, limit,
  getDocs, getDoc, doc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const COLL = 'mental_health_services';

let nb = {
  loading  : false,
  results  : [],
  cityName : '',
  lastFetch: null,
  filter   : 'semua',
  userLat  : null,
  userLng  : null,
};

const FILTERS = [
  { id:'semua',     label:'Semua',    emoji:'🗺️' },
  { id:'Psikolog',  label:'Psikolog', emoji:'🧠' },
  { id:'Psikiatri', label:'Psikiater',emoji:'🏥' },
  { id:'Konseling', label:'Konseling',emoji:'💬' },
];

/* ─── MAP: kota populer → koordinat tengah ─────────────────────── */
const CITY_COORDS = {
  'Jakarta':         { lat:-6.2088, lng:106.8456 },
  'Jakarta Selatan': { lat:-6.2615, lng:106.8106 },
  'Jakarta Utara':   { lat:-6.1214, lng:106.7748 },
  'Jakarta Barat':   { lat:-6.1688, lng:106.7649 },
  'Jakarta Timur':   { lat:-6.2255, lng:106.9004 },
  'Jakarta Pusat':   { lat:-6.1865, lng:106.8240 },
  'Surabaya':        { lat:-7.2575, lng:112.7521 },
  'Bandung':         { lat:-6.9175, lng:107.6191 },
  'Medan':           { lat:3.5952,  lng:98.6722  },
  'Semarang':        { lat:-6.9932, lng:110.4203 },
  'Makassar':        { lat:-5.1477, lng:119.4327 },
  'Yogyakarta':      { lat:-7.7956, lng:110.3695 },
  'Denpasar':        { lat:-8.6705, lng:115.2126 },
  'Palembang':       { lat:-2.9761, lng:104.7754 },
  'Batam':           { lat:1.0456,  lng:104.0305 },
  'Malang':          { lat:-7.9797, lng:112.6304 },
  'Solo':            { lat:-7.5755, lng:110.8243 },
  'Bogor':           { lat:-6.5971, lng:106.8060 },
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ─── Perkirakan kota dari koordinat GPS ───────────────────────── */
function guessCityFromCoords(lat, lng) {
  let nearest = null, minDist = Infinity;
  for (const [city, c] of Object.entries(CITY_COORDS)) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < minDist) { minDist = d; nearest = city; }
  }
  return { city: nearest, distKm: minDist };
}

/* ─── INIT ──────────────────────────────────────────────────────── */
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
      <div class="nb-idle-txt">Temukan psikolog, psikiater & layanan konseling terdekat dari lokasimu</div>
      <button class="nb-cta" onclick="window._findNearby()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Cari Layanan Terdekat
      </button>
    </div>`;
}

/* ─── FIND ──────────────────────────────────────────────────────── */
export async function findNearby() {
  if (nb.loading) return;
  nb.loading = true;

  const el = document.getElementById('nearby-wrap');
  if (!el) { nb.loading = false; return; }

  el.innerHTML = `
    <div class="nb-loading">
      <div class="nb-dots"><div class="nb-dot"></div><div class="nb-dot"></div><div class="nb-dot"></div></div>
      <div class="nb-loading-txt" id="nb-status">Mendeteksi lokasi…</div>
    </div>`;

  const setStatus = t => { const s = document.getElementById('nb-status'); if (s) s.textContent = t; };

  // 1. GPS
  let targetCity = 'Jakarta';
  let userLat = null, userLng = null;

  try {
    setStatus('Mendeteksi lokasi GPS…');
    const coords = await Promise.race([
      getLocation(),
      new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 8000))
    ]);
    userLat = coords.lat;
    userLng = coords.lng;
    nb.userLat = userLat;
    nb.userLng = userLng;

    const { city, distKm } = guessCityFromCoords(userLat, userLng);
    targetCity = city;
    setStatus(`Lokasi: sekitar ${city} (${Math.round(distKm)} km). Mencari layanan…`);
  } catch {
    setStatus('Mencari layanan di seluruh Indonesia…');
  }

  // 2. Query Firestore
  try {
    let results = [];

    if (targetCity && targetCity !== 'Jakarta') {
      // Coba cari by kabupaten_kota dulu
      const q = query(
        collection(db, COLL),
        where('kabupaten_kota', '==', targetCity),
        orderBy('rating', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      snap.forEach(d => results.push(d.data()));
    }

    // Kalau kurang dari 6, tambah dari kota lain / online
    if (results.length < 6) {
      setStatus('Melengkapi data layanan…');
      const q2 = query(
        collection(db, COLL),
        orderBy('rating', 'desc'),
        limit(30)
      );
      const snap2 = await getDocs(q2);
      const existing = new Set(results.map(r => r.id));
      snap2.forEach(d => {
        const data = d.data();
        if (!existing.has(data.id)) results.push(data);
      });
    }

    // Sort by jarak kalau ada GPS
    if (userLat && userLng) {
      results = results.map(r => ({
        ...r,
        _distKm: r.lat && r.lng ? haversineKm(userLat, userLng, r.lat, r.lng) : 9999
      })).sort((a, b) => a._distKm - b._distKm);
    }

    // Ambil 10 terbaik
    results = results.slice(0, 10);

    nb.results   = results;
    nb.cityName  = targetCity || 'Indonesia';
    nb.lastFetch = Date.now();
    nb.loading   = false;
    renderResults(nb.results, nb.filter);

  } catch (e) {
    nb.loading = false;
    console.warn('[nearby] Firestore error:', e.message);
    renderError(e.message);
  }
}

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no_geo')); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      e => reject(new Error('gps_' + e.code)),
      { timeout: 7000, maximumAge: 600000, enableHighAccuracy: false }
    );
  });
}

/* ─── RENDER ────────────────────────────────────────────────────── */
export function renderResults(results, filter) {
  nb.filter = filter;
  const el  = document.getElementById('nearby-wrap');
  if (!el) return;

  // Filter by kategori
  const list = filter === 'semua'
    ? results
    : results.filter(r => r.kategori === filter);

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
  const typeEmoji = {
    'Rumah Sakit'      : '🏥',
    'Rumah Sakit Jiwa' : '🏨',
    'Puskesmas'        : '🏢',
    'Klinik Psikologi' : '🧠',
    'Universitas'      : '🎓',
  };
  const emoji = typeEmoji[r.jenis_layanan] || '🏥';
  const safe  = (r.nama_layanan || '').replace(/'/g, "\\'");
  const distLabel = r._distKm && r._distKm < 9999 ? `${r._distKm < 1 ? '<1' : Math.round(r._distKm)} km` : null;
  const biaya = r.biaya_mulai === 0 ? 'Gratis' : `Mulai Rp ${r.biaya_mulai.toLocaleString('id')}`;
  const asuransi = Array.isArray(r.insurance) && r.insurance.length ? r.insurance.join(', ') : null;

  return `<div class="nb-card">
    <div class="nb-card-top">
      <div class="nb-card-emoji">${emoji}</div>
      <div class="nb-card-info">
        <div class="nb-card-name">${r.nama_layanan || '—'}</div>
        <div class="nb-card-area">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#1db954" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="#1db954" stroke-width="2"/></svg>
          ${r.kabupaten_kota || ''}${distLabel ? ` · <strong>${distLabel}</strong>` : ''}
        </div>
        <div class="nb-rating-row">
          ${starsHTML(r.rating)}
          <span class="nb-rating-num">${(r.rating||0).toFixed(1)}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
        <span class="nb-badge nb-badge-${r.kategori === 'Psikiatri' ? 'psikiater' : r.kategori === 'Psikolog' ? 'psikolog' : 'klinik'}">${r.jenis_layanan || ''}</span>
        ${r.telemedicine ? `<span class="nb-badge" style="background:#e8f5e9;color:#388e3c;font-size:9px">💻 Online</span>` : ''}
        ${r.verified    ? `<span class="nb-badge" style="background:#e3f2fd;color:#1565c0;font-size:9px">✓ Verified</span>` : ''}
      </div>
    </div>

    <div class="nb-card-desc" style="font-size:11px;color:#666;margin:6px 0 4px">${r.specialization || r.kategori}</div>

    <div class="nb-card-meta">
      <div class="nb-meta-item">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#8aab97" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#8aab97" stroke-width="2" stroke-linecap="round"/></svg>
        ${r.jam_buka}–${r.jam_tutup} · ${r.hari}
      </div>
      <div class="nb-meta-item">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><line x1="12" y1="1" x2="12" y2="23" stroke="#8aab97" stroke-width="2"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#8aab97" stroke-width="2" stroke-linecap="round"/></svg>
        ${biaya}${asuransi ? ` · ${asuransi}` : ''}
      </div>
    </div>

    <div class="nb-card-actions">
      ${r.telepon ? `<a class="nb-btn nb-btn-call" href="tel:${r.telepon}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.01 2.34 2 2 0 012 .16h3a2 2 0 012 1.72 12.05 12.05 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.05 12.05 0 002.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg> Hubungi</a>` : ''}
      ${r.website ? `<a class="nb-btn nb-btn-web" href="${r.website}" target="_blank" rel="noopener"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" stroke-width="2"/></svg> Website</a>` : ''}
      <button class="nb-btn nb-btn-web" onclick="window._searchNearby('${safe}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>
        Maps
      </button>
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

function renderError(msg) {
  const el = document.getElementById('nearby-wrap');
  if (!el) return;
  el.innerHTML = `
    <div class="nb-idle">
      <div class="nb-idle-ico">⚠️</div>
      <div class="nb-idle-txt">Gagal memuat data: ${msg}</div>
      <button class="nb-cta" onclick="window._refreshNearby()">Coba Lagi</button>
    </div>`;
}

export function filterNearby(t) { nb.filter = t; if (nb.results.length) renderResults(nb.results, t); }
export function refreshNearby() { nb.results = []; nb.lastFetch = null; findNearby(); }
export function searchNearby(name) { window.open(`https://maps.google.com/maps?q=${encodeURIComponent(name + ' kesehatan mental')}`, '_blank'); }