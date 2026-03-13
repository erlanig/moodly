/* ═══════════════════════════════════════
   MOODLY — nearby.js  (v11 — Firestore + koordinat real dari CSV)
═══════════════════════════════════════ */

import { db } from '../firebase.js';
import {
  collection, query, where, orderBy, limit, getDocs
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

/* ─── Koordinat tengah tiap kabupaten_kota dari data CSV ── */
const CITY_COORDS = {
  'Ambon': {lat:-2.2449, lng:117.7713},
  'Badung': {lat:-2.6985, lng:118.1181},
  'Balikpapan': {lat:-2.9673, lng:114.1258},
  'Bandar Lampung': {lat:-3.4698, lng:118.1351},
  'Bandung': {lat:-1.9269, lng:117.0914},
  'Banjarbaru': {lat:-1.8148, lng:120.2802},
  'Banjarmasin': {lat:-2.1261, lng:119.6104},
  'Bantul': {lat:-2.8124, lng:118.345},
  'Batam': {lat:-2.5764, lng:117.8108},
  'Bekasi': {lat:-2.3146, lng:117.4964},
  'Bima': {lat:-3.2006, lng:118.19},
  'Binjai': {lat:-3.1919, lng:118.0235},
  'Bitung': {lat:-2.2125, lng:116.8387},
  'Bogor': {lat:-2.564, lng:116.4988},
  'Bukittinggi': {lat:-1.8965, lng:118.8646},
  'Cilegon': {lat:-2.461, lng:117.1921},
  'Cimahi': {lat:-1.738, lng:117.6605},
  'Cirebon': {lat:-2.4817, lng:118.4934},
  'Denpasar': {lat:-2.6882, lng:118.0514},
  'Depok': {lat:-2.5434, lng:116.7256},
  'Garut': {lat:-2.8714, lng:119.4663},
  'Gorontalo': {lat:-2.5331, lng:119.1128},
  'Gresik': {lat:-1.6281, lng:119.995},
  'Jakarta Barat': {lat:-2.4174, lng:115.7761},
  'Jakarta Pusat': {lat:-1.7429, lng:117.2802},
  'Jakarta Selatan': {lat:-2.1336, lng:118.6889},
  'Jakarta Timur': {lat:-1.8193, lng:117.3475},
  'Jakarta Utara': {lat:-2.2509, lng:117.4175},
  'Jayapura': {lat:-2.052, lng:118.5391},
  'Kediri': {lat:-2.3227, lng:116.7529},
  'Kendari': {lat:-2.5072, lng:117.4745},
  'Kupang': {lat:-2.9336, lng:116.7391},
  'Madiun': {lat:-2.5867, lng:120.7145},
  'Magelang': {lat:-2.3984, lng:119.5254},
  'Makassar': {lat:-2.616, lng:122.5569},
  'Malang': {lat:-2.5487, lng:117.4238},
  'Manado': {lat:-2.665, lng:118.3534},
  'Mataram': {lat:-3.3101, lng:114.9185},
  'Medan': {lat:-2.0955, lng:117.9677},
  'Padang': {lat:-2.1675, lng:116.513},
  'Palembang': {lat:-2.7814, lng:119.7578},
  'Palu': {lat:-2.1221, lng:118.374},
  'Parepare': {lat:-1.7496, lng:117.2156},
  'Pekanbaru': {lat:-3.0449, lng:118.2646},
  'Pontianak': {lat:-3.3013, lng:117.7167},
  'Purwokerto': {lat:-1.5339, lng:118.835},
  'Samarinda': {lat:-1.4814, lng:118.6707},
  'Semarang': {lat:-2.3485, lng:120.3569},
  'Serang': {lat:-3.1245, lng:117.9373},
  'Sidoarjo': {lat:-2.8325, lng:119.3493},
  'Singkawang': {lat:-2.3046, lng:117.7405},
  'Sleman': {lat:-3.3431, lng:118.0166},
  'Solo': {lat:-2.4201, lng:113.7615},
  'Sorong': {lat:-3.2035, lng:114.7609},
  'Sukabumi': {lat:-2.2846, lng:119.0138},
  'Surabaya': {lat:-2.369, lng:116.629},
  'Tabanan': {lat:-2.6764, lng:117.7637},
  'Tangerang': {lat:-2.7031, lng:113.6987},
  'Tangerang Selatan': {lat:-2.0726, lng:119.7717},
  'Tanjung Pinang': {lat:-3.2525, lng:116.5109},
  'Tasikmalaya': {lat:-2.7762, lng:120.3572},
  'Tegal': {lat:-1.5727, lng:117.9101},
  'Ternate': {lat:-2.4175, lng:116.0563},
  'Yogyakarta': {lat:-1.5713, lng:116.4671},
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* Cari kabupaten_kota terdekat dari koordinat GPS */
function nearestCity(lat, lng) {
  let best = null, minDist = Infinity;
  for (const [city, c] of Object.entries(CITY_COORDS)) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < minDist) { minDist = d; best = city; }
  }
  return { city: best, distKm: Math.round(minDist) };
}

/* ════════════════════════════════
   INIT
════════════════════════════════ */
export function initNearby() {
  const el = document.getElementById('nearby-wrap');
  if (!el) return;
  if (nb.results.length && nb.lastFetch && (Date.now()-nb.lastFetch) < 30*60*1000) {
    renderResults(nb.results, nb.filter); return;
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

/* ════════════════════════════════
   FIND
════════════════════════════════ */
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

  const setStatus = t => { const s=document.getElementById('nb-status'); if(s) s.textContent=t; };

  let targetCity = null;
  let userLat = null, userLng = null;

  // 1. GPS → cari kota terdekat dari CITY_COORDS
  try {
    setStatus('Mendeteksi lokasi GPS…');
    const coords = await Promise.race([
      getLocation(),
      new Promise((_,r) => setTimeout(() => r(new Error('timeout')), 8000))
    ]);
    userLat = coords.lat;
    userLng = coords.lng;
    nb.userLat = userLat;
    nb.userLng = userLng;

    const { city, distKm } = nearestCity(userLat, userLng);
    targetCity = city;
    setStatus(`Sekitar ${city} (±${distKm} km). Mencari layanan…`);
  } catch {
    setStatus('Mencari layanan di Indonesia…');
  }

  // 2. Query Firestore
  try {
    let results = [];

    // A. Cari by kabupaten_kota terdekat
    if (targetCity) {
      const q = query(
        collection(db, COLL),
        where('kabupaten_kota', '==', targetCity),
        orderBy('rating', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      snap.forEach(d => results.push(d.data()));
      setStatus(`Ditemukan ${results.length} di ${targetCity}. Melengkapi…`);
    }

    // B. Kalau < 8, ambil kota-kota terdekat lainnya
    if (results.length < 8 && userLat && userLng) {
      // Urutkan semua kota berdasarkan jarak
      const sortedCities = Object.entries(CITY_COORDS)
        .map(([city, c]) => ({ city, dist: haversineKm(userLat, userLng, c.lat, c.lng) }))
        .sort((a,b) => a.dist - b.dist)
        .slice(1, 4) // 3 kota terdekat berikutnya
        .map(c => c.city);

      for (const city of sortedCities) {
        if (results.length >= 12) break;
        const q = query(
          collection(db, COLL),
          where('kabupaten_kota', '==', city),
          orderBy('rating', 'desc'),
          limit(6)
        );
        const snap = await getDocs(q);
        const existing = new Set(results.map(r => r.id));
        snap.forEach(d => { const data=d.data(); if(!existing.has(data.id)) results.push(data); });
      }
    }

    // C. Masih < 8? Ambil rating tertinggi nasional
    if (results.length < 8) {
      const q = query(collection(db, COLL), orderBy('rating', 'desc'), limit(20));
      const snap = await getDocs(q);
      const existing = new Set(results.map(r => r.id));
      snap.forEach(d => { const data=d.data(); if(!existing.has(data.id)) results.push(data); });
    }

    // D. Hitung jarak dari GPS ke tiap layanan (pakai koordinat lat/lng dari dokumen)
    if (userLat && userLng) {
      results = results.map(r => ({
        ...r,
        _distKm: (r.lat && r.lng) ? haversineKm(userLat, userLng, r.lat, r.lng) : 9999
      })).sort((a,b) => a._distKm - b._distKm);
    }

    results = results.slice(0, 12);

    nb.results   = results;
    nb.cityName  = targetCity || 'Indonesia';
    nb.lastFetch = Date.now();
    nb.loading   = false;
    renderResults(nb.results, nb.filter);

  } catch (e) {
    nb.loading = false;
    console.error('[nearby] Firestore error:', e);
    renderError(e.message);
  }
}

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no_geo')); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat:p.coords.latitude, lng:p.coords.longitude }),
      e => reject(new Error('gps_'+e.code)),
      { timeout:7000, maximumAge:600000, enableHighAccuracy:false }
    );
  });
}

/* ════════════════════════════════
   RENDER
════════════════════════════════ */
export function renderResults(results, filter) {
  nb.filter = filter;
  const el  = document.getElementById('nearby-wrap');
  if (!el) return;

  const list = filter === 'semua' ? results : results.filter(r => r.kategori === filter);

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
  const typeEmoji = {
    'Rumah Sakit':'🏥', 'Rumah Sakit Jiwa':'🏨',
    'Puskesmas':'🏢', 'Klinik Psikologi':'🧠', 'Universitas':'🎓'
  };
  const emoji    = typeEmoji[r.jenis_layanan] || '🏥';
  const safe     = (r.nama_layanan||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
  const distLabel= r._distKm && r._distKm < 9999
    ? `<strong>${r._distKm < 1 ? '<1' : Math.round(r._distKm)} km</strong>` : '';
  const biaya    = r.biaya_mulai === 0 ? 'Gratis' : `Mulai Rp ${Number(r.biaya_mulai).toLocaleString('id')}`;
  const asuransi = Array.isArray(r.insurance) && r.insurance.length ? r.insurance.join(', ') : '';
  const badgeKat = r.kategori==='Psikiatri' ? 'psikiater' : r.kategori==='Psikolog' ? 'psikolog' : 'klinik';

  return `<div class="nb-card">
    <div class="nb-card-top">
      <div class="nb-card-emoji">${emoji}</div>
      <div class="nb-card-info">
        <div class="nb-card-name">${r.nama_layanan||'—'}</div>
        <div class="nb-card-area">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="#1db954" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="#1db954" stroke-width="2"/></svg>
          ${r.kabupaten_kota||''} ${distLabel}
        </div>
        <div class="nb-rating-row">
          ${starsHTML(r.rating)}
          <span class="nb-rating-num">${(r.rating||0).toFixed(1)}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;flex-shrink:0">
        <span class="nb-badge nb-badge-${badgeKat}">${r.jenis_layanan||''}</span>
        ${r.telemedicine ? `<span class="nb-badge" style="background:#e8f5e9;color:#388e3c;font-size:9px">💻 Online</span>` : ''}
        ${r.verified     ? `<span class="nb-badge" style="background:#e3f2fd;color:#1565c0;font-size:9px">✓ Verified</span>` : ''}
      </div>
    </div>
    <div style="font-size:11px;color:#777;margin:5px 0 4px">${r.specialization||r.kategori||''}</div>
    <div class="nb-card-meta">
      <div class="nb-meta-item">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#8aab97" stroke-width="2"/><path d="M12 6v6l4 2" stroke="#8aab97" stroke-width="2" stroke-linecap="round"/></svg>
        ${r.jam_buka||''}–${r.jam_tutup||''} · ${r.hari||''}
      </div>
      <div class="nb-meta-item">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><line x1="12" y1="1" x2="12" y2="23" stroke="#8aab97" stroke-width="2"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#8aab97" stroke-width="2" stroke-linecap="round"/></svg>
        ${biaya}${asuransi ? ' · '+asuransi : ''}
      </div>
    </div>
    <div class="nb-card-actions">
      ${r.telepon ? `<a class="nb-btn nb-btn-call" href="tel:${r.telepon}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.01 2.34 2 2 0 012 .16h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg>
        Hubungi</a>` : ''}
      ${r.website ? `<a class="nb-btn nb-btn-web" href="${r.website}" target="_blank" rel="noopener">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" stroke-width="2"/></svg>
        Website</a>` : ''}
      <button class="nb-btn nb-btn-web" onclick="window._searchNearby('${safe}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>
        Maps</button>
    </div>
  </div>`;
}

function starsHTML(rating) {
  const r = Math.round((rating||0)*2)/2;
  let h = '';
  for (let i=1; i<=5; i++) {
    const on = i<=r;
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
      <div class="nb-idle-txt">Gagal memuat: ${msg}</div>
      <button class="nb-cta" onclick="window._refreshNearby()">Coba Lagi</button>
    </div>`;
}

export function filterNearby(t)  { nb.filter=t; if(nb.results.length) renderResults(nb.results,t); }
export function refreshNearby()  { nb.results=[]; nb.lastFetch=null; findNearby(); }
export function searchNearby(n)  { window.open(`https://maps.google.com/maps?q=${encodeURIComponent(n+' kesehatan mental')}`, '_blank'); }