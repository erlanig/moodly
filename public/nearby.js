/* ═══════════════════════════════════════
   MOODLY — nearby.js  (v12 — koordinat real Indonesia)
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

/* ─── Koordinat REAL tiap kabupaten_kota (bukan dari CSV) ── */
const CITY_COORDS = {
  'Ambon':             { lat:-3.6954,  lng:128.1814 },
  'Badung':            { lat:-8.6178,  lng:115.1694 },
  'Balikpapan':        { lat:-1.2654,  lng:116.8312 },
  'Bandar Lampung':    { lat:-5.3971,  lng:105.2668 },
  'Bandung':           { lat:-6.9175,  lng:107.6191 },
  'Banjarbaru':        { lat:-3.4417,  lng:114.8307 },
  'Banjarmasin':       { lat:-3.3186,  lng:114.5944 },
  'Bantul':            { lat:-7.8816,  lng:110.3279 },
  'Batam':             { lat:1.0456,   lng:104.0305 },
  'Bekasi':            { lat:-6.2383,  lng:106.9756 },
  'Bima':              { lat:-8.4608,  lng:118.7183 },
  'Binjai':            { lat:3.5960,   lng:98.4854  },
  'Bitung':            { lat:1.4406,   lng:125.1904 },
  'Bogor':             { lat:-6.5971,  lng:106.8060 },
  'Bukittinggi':       { lat:-0.3080,  lng:100.3690 },
  'Cilegon':           { lat:-6.0020,  lng:106.0514 },
  'Cimahi':            { lat:-6.8720,  lng:107.5420 },
  'Cirebon':           { lat:-6.7320,  lng:108.5523 },
  'Denpasar':          { lat:-8.6705,  lng:115.2126 },
  'Depok':             { lat:-6.4025,  lng:106.7942 },
  'Garut':             { lat:-7.2167,  lng:107.9085 },
  'Gorontalo':         { lat:0.5435,   lng:123.0595 },
  'Gresik':            { lat:-7.1560,  lng:112.6509 },
  'Jakarta Barat':     { lat:-6.1688,  lng:106.7649 },
  'Jakarta Pusat':     { lat:-6.1865,  lng:106.8240 },
  'Jakarta Selatan':   { lat:-6.2615,  lng:106.8106 },
  'Jakarta Timur':     { lat:-6.2255,  lng:106.9004 },
  'Jakarta Utara':     { lat:-6.1214,  lng:106.7748 },
  'Jayapura':          { lat:-2.5337,  lng:140.7186 },
  'Kediri':            { lat:-7.8166,  lng:112.0113 },
  'Kendari':           { lat:-3.9985,  lng:122.5127 },
  'Kupang':            { lat:-10.1772, lng:123.6070 },
  'Madiun':            { lat:-7.6298,  lng:111.5239 },
  'Magelang':          { lat:-7.4797,  lng:110.2177 },
  'Makassar':          { lat:-5.1477,  lng:119.4327 },
  'Malang':            { lat:-7.9797,  lng:112.6304 },
  'Manado':            { lat:1.4748,   lng:124.8421 },
  'Mataram':           { lat:-8.5833,  lng:116.1167 },
  'Medan':             { lat:3.5952,   lng:98.6722  },
  'Padang':            { lat:-0.9492,  lng:100.3543 },
  'Palembang':         { lat:-2.9761,  lng:104.7754 },
  'Palu':              { lat:-0.8917,  lng:119.8707 },
  'Parepare':          { lat:-4.0135,  lng:119.6298 },
  'Pekanbaru':         { lat:0.5071,   lng:101.4478 },
  'Pontianak':         { lat:-0.0264,  lng:109.3425 },
  'Purwokerto':        { lat:-7.4240,  lng:109.2350 },
  'Samarinda':         { lat:-0.5022,  lng:117.1536 },
  'Semarang':          { lat:-6.9932,  lng:110.4203 },
  'Serang':            { lat:-6.1202,  lng:106.1502 },
  'Sidoarjo':          { lat:-7.4458,  lng:112.7183 },
  'Singkawang':        { lat:0.8997,   lng:108.9876 },
  'Sleman':            { lat:-7.7171,  lng:110.3553 },
  'Solo':              { lat:-7.5755,  lng:110.8243 },
  'Sorong':            { lat:-0.8761,  lng:131.2559 },
  'Sukabumi':          { lat:-6.9215,  lng:106.9270 },
  'Surabaya':          { lat:-7.2575,  lng:112.7521 },
  'Tabanan':           { lat:-8.5363,  lng:115.1248 },
  'Tangerang':         { lat:-6.1783,  lng:106.6319 },
  'Tangerang Selatan': { lat:-6.2897,  lng:106.7178 },
  'Tanjung Pinang':    { lat:0.9186,   lng:104.4564 },
  'Tasikmalaya':       { lat:-7.3274,  lng:108.2207 },
  'Tegal':             { lat:-6.8697,  lng:109.1402 },
  'Ternate':           { lat:0.7833,   lng:127.3667 },
  'Yogyakarta':        { lat:-7.7956,  lng:110.3695 },
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function nearestCity(lat, lng) {
  let best = null, minDist = Infinity;
  for (const [city, c] of Object.entries(CITY_COORDS)) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < minDist) { minDist = d; best = city; }
  }
  return { city: best, distKm: Math.round(minDist) };
}

/* ════════════════ INIT ════════════════ */
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

/* ════════════════ FIND ════════════════ */
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
  let cityDistKm = null;

  // 1. GPS → cari kota terdekat
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
    cityDistKm = distKm;
    setStatus(`Sekitar ${city}. Mencari layanan…`);
  } catch {
    setStatus('Mencari layanan di Indonesia…');
  }

  // 2. Query Firestore
  try {
    let results = [];
    const existing = () => new Set(results.map(r => r.id));

    // A. Kota terdekat
    if (targetCity) {
      const snap = await getDocs(query(
        collection(db, COLL),
        where('kabupaten_kota', '==', targetCity),
        orderBy('rating', 'desc'),
        limit(20)
      ));
      snap.forEach(d => results.push({ ...d.data(), _cityDist: cityDistKm }));
    }

    // B. Kota-kota terdekat berikutnya (kalau < 8)
    if (results.length < 8 && userLat && userLng) {
      const nearby = Object.entries(CITY_COORDS)
        .map(([city, c]) => ({ city, dist: Math.round(haversineKm(userLat, userLng, c.lat, c.lng)) }))
        .sort((a,b) => a.dist - b.dist)
        .filter(c => c.city !== targetCity)
        .slice(0, 4);

      for (const { city, dist } of nearby) {
        if (results.length >= 12) break;
        const snap = await getDocs(query(
          collection(db, COLL),
          where('kabupaten_kota', '==', city),
          orderBy('rating', 'desc'),
          limit(5)
        ));
        const ex = existing();
        snap.forEach(d => { if (!ex.has(d.data().id)) results.push({ ...d.data(), _cityDist: dist }); });
      }
    }

    // C. Fallback: rating tertinggi nasional
    if (results.length < 8) {
      const snap = await getDocs(query(collection(db, COLL), orderBy('rating', 'desc'), limit(20)));
      const ex = existing();
      snap.forEach(d => { if (!ex.has(d.data().id)) results.push({ ...d.data(), _cityDist: null }); });
    }

    // Sort: kota terdekat dulu, lalu by rating
    results.sort((a,b) => {
      if (a._cityDist !== b._cityDist) return (a._cityDist??9999) - (b._cityDist??9999);
      return (b.rating||0) - (a.rating||0);
    });

    nb.results   = results.slice(0, 12);
    nb.cityName  = targetCity || 'Indonesia';
    nb.lastFetch = Date.now();
    nb.loading   = false;
    renderResults(nb.results, nb.filter);

  } catch (e) {
    nb.loading = false;
    console.error('[nearby]', e);
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

/* ════════════════ RENDER ════════════════ */
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
    'Rumah Sakit':'🏥','Rumah Sakit Jiwa':'🏨',
    'Puskesmas':'🏢','Klinik Psikologi':'🧠','Universitas':'🎓'
  };
  const emoji    = typeEmoji[r.jenis_layanan] || '🏥';
  const safe     = (r.nama_layanan||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
  const distLabel= r._cityDist != null ? `· <strong>~${r._cityDist} km</strong>` : '';
  const biaya    = !r.biaya_mulai ? 'Gratis' : `Mulai Rp ${Number(r.biaya_mulai).toLocaleString('id')}`;
  const asuransi = Array.isArray(r.insurance) && r.insurance.length ? r.insurance.join(', ') : '';
  const badgeKat = r.kategori==='Psikiatri'?'psikiater':r.kategori==='Psikolog'?'psikolog':'klinik';

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
        ${r.telemedicine?`<span class="nb-badge" style="background:#e8f5e9;color:#388e3c;font-size:9px">💻 Online</span>`:''}
        ${r.verified?`<span class="nb-badge" style="background:#e3f2fd;color:#1565c0;font-size:9px">✓ Verified</span>`:''}
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
        ${biaya}${asuransi?' · '+asuransi:''}
      </div>
    </div>
    <div class="nb-card-actions">
      ${r.telepon?`<a class="nb-btn nb-btn-call" href="tel:${r.telepon}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 11 19.79 19.79 0 01.01 2.34 2 2 0 012 .16h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" stroke-width="2"/></svg> Hubungi</a>`:''}
      ${r.website?`<a class="nb-btn nb-btn-web" href="${r.website}" target="_blank" rel="noopener"><svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" stroke="currentColor" stroke-width="2"/></svg> Website</a>`:''}
      <button class="nb-btn nb-btn-web" onclick="window._searchNearby('${safe}')">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>
        Maps</button>
    </div>
  </div>`;
}

function starsHTML(rating) {
  const r = Math.round((rating||0)*2)/2;
  let h = '';
  for (let i=1;i<=5;i++) {
    const on=i<=r;
    h+=`<svg width="9" height="9" viewBox="0 0 24 24"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="${on?'#f57c00':'#e0f0e8'}" stroke="${on?'#f57c00':'#c5dfd0'}" stroke-width="1"/></svg>`;
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