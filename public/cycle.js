/* ═══════════════════════════════════════
   MOODLY — cycle.js
   Menstrual cycle tracker: logic + UI
   + Daily flow log per-hari  ← BARU
   + Per-day symptom tracker  ← BARU
   + AI food recommendation   ← BARU
   ═══════════════════════════════════════ */

import {
  loadPeriods, addPeriod, updatePeriod, deletePeriod,
  saveCycleSettings, loadCycleSettings,
  loadPeriodDays, savePeriodDay,
  loadFoodCache, saveFoodCache
} from '../firebase.js';

/* ════════════════
   CONSTANTS
════════════════ */
export const PHASES = [
  {
    id: 'mens', name: 'Menstruasi', emoji: '🩸', color: '#ff6b8a',
    tip: 'Istirahat lebih banyak, minum air hangat, kompres perut jika kram. Mood mungkin lebih sensitif — itu wajar. Self-compassion dulu ya 💗'
  },
  {
    id: 'foll', name: 'Folikular', emoji: '🌱', color: '#f59e0b',
    tip: 'Energi mulai naik! Waktu terbaik untuk memulai proyek baru, belajar hal baru, atau berolahraga lebih intens. Kamu sedang di momentum terbaikmu ✨'
  },
  {
    id: 'ovul', name: 'Ovulasi', emoji: '⭐', color: '#8b5cf6',
    tip: 'Puncak energi dan kepercayaan diri! Waktu ideal untuk presentasi, bersosialisasi, atau aktivitas high-intensity. Manfaatkan momen luar biasa ini 🌟'
  },
  {
    id: 'lute', name: 'Luteal', emoji: '🌙', color: '#3b82f6',
    tip: 'Energi mulai turun, PMS mungkin muncul. Prioritaskan self-care, kurangi kafein, dan jangan terlalu keras pada dirimu. Kamu sudah cukup baik 🫂'
  },
];

export const SYMPTOMS = [
  {e:'😣',l:'Kram'}, {e:'🤕',l:'Sakit kepala'}, {e:'😪',l:'Lelah'},
  {e:'🤢',l:'Mual'}, {e:'😤',l:'Mood swing'}, {e:'🫃',l:'Kembung'},
  {e:'😴',l:'Ngantuk'}, {e:'🍫',l:'Ngidam'}, {e:'😢',l:'Emosional'},
  {e:'🔥',l:'Nyeri punggung'}, {e:'😬',l:'Jerawat'}, {e:'💤',l:'Insomnia'},
];

export const FLOWS = [
  {l:'Sedikit', dots:1}, {l:'Sedang', dots:2},
  {l:'Deras', dots:3},   {l:'Sangat deras', dots:4},
];

/* ════════════════
   STATE
════════════════ */
let cycleSettings = { avgLen: 28, avgDur: 5 };
let periods = [];
let curFlow = null;
let curSymptoms = [];
let editingPeriodId = null;

/* State untuk daily log ← BARU */
let periodDays = {};          // { [periodId]: [{date, flow, symptoms}] }
let dailyLogFlow = null;      // index ke FLOWS
let dailyLogSymptoms = [];    // array index ke SYMPTOMS
let editingDayDate = null;    // "YYYY-MM-DD"

/* State food recommendation ← BARU */
let foodCache = null;
let foodLoading = false;

/* ════════════════
   INIT
════════════════ */
export async function initCycle() {
  const [settings, pds] = await Promise.all([
    loadCycleSettings(),
    loadPeriods()
  ]);
  if (settings) cycleSettings = { ...cycleSettings, ...settings };
  periods = pds || [];

  /* Load daily logs untuk 8 periode terbaru ← BARU */
  const recentPeriods = [...periods]
    .sort((a, b) => parseDateSafe(b.startDate) - parseDateSafe(a.startDate))
    .slice(0, 8);
  await Promise.all(recentPeriods.map(async p => {
    if (p.id) periodDays[p.id] = await loadPeriodDays(p.id);
  }));

  /* Load food cache ← BARU */
  foodCache = await loadFoodCache();
}

export function getCycleSettings() { return cycleSettings; }
export function getPeriods() { return periods; }

/* ════════════════
   CYCLE ENGINE
════════════════ */
function calcAvgCycleLen() {
  if (periods.length < 2) return cycleSettings.avgLen;
  const sorted = [...periods].sort((a, b) => parseDateSafe(a.startDate) - parseDateSafe(b.startDate));
  let total = 0, count = 0;
  for (let i = 1; i < sorted.length; i++) {
    const diff = diffDays(new Date(sorted[i - 1].startDate), new Date(sorted[i].startDate));
    if (diff >= 18 && diff <= 50) { total += diff; count++; }
  }
  return count > 0 ? Math.round(total / count) : cycleSettings.avgLen;
}

function calcAvgDuration() {
  const withEnd = periods.filter(p => p.endDate);
  if (!withEnd.length) return cycleSettings.avgDur;
  const avg = withEnd.reduce((s, p) => s + diffDays(parseDateSafe(p.startDate), parseDateSafe(p.endDate)) + 1, 0) / withEnd.length;
  return Math.round(avg);
}

function getLastPeriod() {
  if (!periods.length) return null;
  return [...periods].sort((a, b) => parseDateSafe(b.startDate) - parseDateSafe(a.startDate))[0];
}

export function getCurrentCycleInfo() {
  const last = getLastPeriod();
  if (!last) return null;

  const len = calcAvgCycleLen();
  const dur = calcAvgDuration();
  const lmp = parseDateSafe(last.startDate); lmp.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysSince = diffDays(lmp, today);
  const dayOfCycle = ((daysSince % len) + len) % len + 1;
  const phase = getCyclePhase(dayOfCycle, len, dur);

  return { dayOfCycle, phase, lmp, len, dur };
}

export function getCyclePhase(dayOfCycle, len, dur) {
  dur = dur || calcAvgDuration();
  len = len || calcAvgCycleLen();
  const follEnd = dur + Math.round((len - dur) * 0.35);
  const ovulEnd = follEnd + 3;
  if (dayOfCycle <= dur)       return 'mens';
  if (dayOfCycle <= follEnd)   return 'foll';
  if (dayOfCycle <= ovulEnd)   return 'ovul';
  return 'lute';
}

export function getPredictions() {
  const last = getLastPeriod();
  if (!last) return [];

  const len = calcAvgCycleLen();
  const dur = calcAvgDuration();
  const lmp = parseDateSafe(last.startDate); lmp.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysSince = diffDays(lmp, today);
  const cyclesPassed = Math.floor(daysSince / len);

  let nextPeriodStart = addDays(lmp, (cyclesPassed + 1) * len);
  if (diffDays(today, nextPeriodStart) < 0) nextPeriodStart = addDays(nextPeriodStart, len);
  const nextPeriodEnd  = addDays(nextPeriodStart, dur - 1);
  const nextOvul       = addDays(nextPeriodStart, len - 14);
  const fertileStart   = addDays(nextOvul, -5);
  const fertileEnd     = addDays(nextOvul, 1);

  const fmt      = d => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const daysUntil = d => diffDays(today, d);

  return [
    { label: 'Menstruasi berikutnya', date: `${fmt(nextPeriodStart)} – ${fmt(nextPeriodEnd)}`, daysUntil: daysUntil(nextPeriodStart), color: '#ff6b8a' },
    { label: 'Perkiraan ovulasi',     date: fmt(nextOvul),                                    daysUntil: daysUntil(nextOvul),        color: '#8b5cf6' },
    { label: 'Fertile window',        date: `${fmt(fertileStart)} – ${fmt(fertileEnd)}`,      daysUntil: daysUntil(fertileStart),    color: '#f59e0b' },
  ];
}

/* ════════════════
   DAILY LOG HELPERS  ← BARU
════════════════ */

/** Periode yang sedang aktif (hari ini ada di dalamnya) */
function getActivePeriod() {
  const today = fmtDateInput(new Date());
  return periods.find(p => {
    if (!p.startDate || p.startDate > today) return false;
    if (p.endDate && p.endDate < today) return false;
    if (!p.endDate) {
      // Tanpa endDate: masih aktif jika mulai dalam 14 hari terakhir
      const start = parseDateSafe(p.startDate);
      const diff  = diffDays(start, new Date());
      return diff >= 0 && diff <= 14;
    }
    return true;
  }) || null;
}

/** Hari ke-berapa dalam satu periode (1-based) */
function getDayOfPeriod(period) {
  const start = parseDateSafe(period.startDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return diffDays(start, today) + 1;
}

/** Log harian hari ini untuk periode tertentu */
function getTodayLog(periodId) {
  const today  = fmtDateInput(new Date());
  const days   = periodDays[periodId] || [];
  return days.find(d => d.date === today) || null;
}

/* ════════════════
   PERIOD LOG ACTIONS
════════════════ */
export async function logPeriod({ startDate, endDate, flow, symptoms }) {
  const period = { startDate, endDate: endDate || null, flow, symptoms };
  const id = await addPeriod(period);
  periods.unshift({ id, ...period });
  periodDays[id] = [];            // init empty daily log
  await saveCycleSettings(cycleSettings);
  return id;
}

export async function updatePeriodEntry(id, data) {
  await updatePeriod(id, data);
  const idx = periods.findIndex(p => p.id === id);
  if (idx >= 0) periods[idx] = { ...periods[idx], ...data };
}

export async function removePeriod(id) {
  await deletePeriod(id);
  periods = periods.filter(p => p.id !== id);
  delete periodDays[id];
}

/* ════════════════
   UI — CYCLE SCREEN
════════════════ */
export function renderCycleScreen(entries = []) {
  const info = getCurrentCycleInfo();
  renderPhaseCard(info);
  renderDailyLogBanner();       // ← BARU: banner isi harian
  renderCycleStrip(info);
  renderPhaseMiniCards(info);
  renderPeriodHistory();
  renderLogCard();
  renderPredictions();
  renderMoodPhaseCorr(entries, info);
  renderCycleTip(info);
  renderFoodRecommendation();   // ← BARU: saran makanan AI (async, fire-and-forget)
}

/* ════════════════
   DAILY LOG BANNER  ← BARU
   Muncul saat periode aktif
════════════════ */
function renderDailyLogBanner() {
  const el = document.getElementById('daily-log-banner');
  if (!el) return;

  const active = getActivePeriod();
  if (!active) { el.innerHTML = ''; return; }

  const dayNum   = getDayOfPeriod(active);
  const todayLog = getTodayLog(active.id);

  if (todayLog) {
    /* Sudah dicatat hari ini — tampilkan ringkasan */
    const flowDots = todayLog.flow
      ? (FLOWS.find(f => f.l === todayLog.flow)?.dots || 0)
      : 0;
    const symsHtml = (todayLog.symptoms || []).slice(0, 3)
      .map(s => `<span class="db-chip">${s}</span>`).join('');
    el.innerHTML = `
      <div class="daily-banner daily-banner-done" onclick="window._openDailyLog()">
        <div class="db-icon">🩸</div>
        <div class="db-body">
          <div class="db-day">Hari ke-${dayNum} · Log Harian</div>
          <div class="db-status">
            ${'<span class="fd fd-pink"></span>'.repeat(flowDots)}
            ${todayLog.flow ? `<b>${todayLog.flow}</b>` : ''}
          </div>
          ${symsHtml ? `<div class="db-chips">${symsHtml}</div>` : ''}
        </div>
        <div class="db-edit-btn">Edit ›</div>
      </div>`;
  } else {
    /* Belum dicatat — prompt user */
    el.innerHTML = `
      <div class="daily-banner daily-banner-prompt" onclick="window._openDailyLog()">
        <div class="db-icon">🩸</div>
        <div class="db-body">
          <div class="db-day">Hari ke-${dayNum} Menstruasi</div>
          <div class="db-sub">Isi kondisi hari ini? Derasnya & gejala apa yang dirasakan.</div>
        </div>
        <button class="db-fill-btn">Isi ›</button>
      </div>`;
  }
}

/* ════════════════
   DAILY LOG MODAL  ← BARU
════════════════ */
export function openDailyLog() {
  const active = getActivePeriod();
  if (!active) {
    window._moodlyAlert({ icon:'🩸', title:'Tidak ada periode aktif', msg:'Catat dulu periode menstruasimu via tombol + di atas.' });
    return;
  }

  dailyLogFlow     = null;
  dailyLogSymptoms = [];
  editingDayDate   = fmtDateInput(new Date());

  /* Pre-fill jika sudah ada log hari ini */
  const todayLog = getTodayLog(active.id);
  if (todayLog) {
    const fIdx = FLOWS.findIndex(f => f.l === todayLog.flow);
    dailyLogFlow = fIdx >= 0 ? fIdx : null;
    dailyLogSymptoms = (todayLog.symptoms || [])
      .map(s => SYMPTOMS.findIndex(x => x.l === s))
      .filter(i => i >= 0);
  }

  /* Update judul modal */
  const title = document.getElementById('daily-modal-title');
  if (title) {
    const dayNum = getDayOfPeriod(active);
    title.textContent = `🩸 Log Hari ke-${dayNum}`;
  }

  renderDailyLogModal();
  openModal('daily-log-modal');
}

function renderDailyLogModal() {
  const flowEl = document.getElementById('daily-flow-row');
  const symEl  = document.getElementById('daily-sym-grid');
  if (!flowEl || !symEl) return;

  flowEl.innerHTML = FLOWS.map((f, i) => `
    <div class="flow-btn${dailyLogFlow === i ? ' sel' : ''}" onclick="window._selectDailyFlow(${i})">
      <div class="flow-dot-row">${'<div class="fd"></div>'.repeat(f.dots)}</div>
      ${f.l}
    </div>`).join('');

  symEl.innerHTML = SYMPTOMS.map((s, i) => `
    <div class="sym-btn${dailyLogSymptoms.includes(i) ? ' sel' : ''}" onclick="window._toggleDailySym(${i})">
      <span class="sym-e">${s.e}</span>
      <span class="sym-l">${s.l}</span>
    </div>`).join('');
}

export async function submitDailyLog() {
  const active = getActivePeriod();
  if (!active || !editingDayDate) return;

  const data = {
    date:     editingDayDate,
    flow:     dailyLogFlow !== null ? FLOWS[dailyLogFlow].l : null,
    symptoms: dailyLogSymptoms.map(i => SYMPTOMS[i].l),
  };

  /* Update state lokal */
  if (!periodDays[active.id]) periodDays[active.id] = [];
  const days = periodDays[active.id];
  const idx = days.findIndex(d => d.date === editingDayDate);
  if (idx >= 0) days[idx] = data; else days.push(data);

  /* Simpan ke Firebase */
  await savePeriodDay(active.id, editingDayDate, data);

  closeModal('daily-log-modal');
  renderDailyLogBanner();
  renderPeriodHistory();

  window._moodlyToast?.('Log harian tersimpan ✓');

  /* Refresh saran makanan dengan data gejala terbaru */
  renderFoodRecommendation(true);
}

/* ════════════════
   FOOD RECOMMENDATION  ← BARU
   AI (Groq) menyarankan makanan berdasarkan
   fase siklus + gejala hari ini
════════════════ */
export async function renderFoodRecommendation(forceRefresh = false) {
  const el = document.getElementById('food-rec-card');
  if (!el) return;

  const info = getCurrentCycleInfo();
  if (!info) { el.innerHTML = ''; return; }

  const today = new Date().toDateString();

  /* Gunakan cache jika masih valid (fase sama, hari sama) */
  if (!forceRefresh && foodCache &&
      foodCache.phase === info.phase &&
      foodCache.date  === today &&
      foodCache.items?.length) {
    _renderFoodItems(el, foodCache.items, info.phase);
    return;
  }

  if (foodLoading) return;
  foodLoading = true;

  /* Ambil gejala dari log harian hari ini */
  const active   = getActivePeriod();
  const todayLog = active ? getTodayLog(active.id) : null;
  const symptoms = todayLog?.symptoms || [];
  const flow     = todayLog?.flow     || null;

  /* Loading state */
  el.innerHTML = `
    <div class="food-rec-inner">
      <div class="card-ttl">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#1db954"/>
        </svg>
        Rekomendasi Makanan AI
      </div>
      <div class="ldwrap" style="padding:24px 0">
        <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        <div class="ld-txt">Moodly AI menyiapkan saran makanan…</div>
      </div>
    </div>`;

  /* Panggil Groq */
  const items = await _fetchFoodFromGroq(info.phase, symptoms, flow);

  foodLoading = false;

  if (items?.length) {
    foodCache = { phase: info.phase, items, date: today };
    await saveFoodCache(info.phase, items);
    _renderFoodItems(el, items, info.phase);
  } else {
    /* Fallback statis jika Groq gagal */
    const fallback = _fallbackFood(info.phase);
    _renderFoodItems(el, fallback, info.phase);
  }
}

function _renderFoodItems(el, items, phase) {
  const phaseNames = { mens:'Menstruasi', foll:'Folikular', ovul:'Ovulasi', lute:'Luteal' };
  el.innerHTML = `
    <div class="food-rec-inner">
      <div class="card-ttl" style="margin-bottom:12px">
        🥗 Makanan untuk Fase ${phaseNames[phase] || ''}
        <button onclick="window._refreshFood()" class="food-refresh-btn">↻ Refresh</button>
      </div>
      <div class="food-list">
        ${items.map(item => `
          <div class="food-item">
            <div class="food-emoji">${item.emoji || '🍽️'}</div>
            <div class="food-info">
              <div class="food-name">${item.nama || item.name || ''}</div>
              <div class="food-reason">${item.alasan || item.reason || ''}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="food-note">
        💡 Saran AI berdasarkan fase siklus${items._fromSymptoms ? ' & gejala hari ini' : ''} · bukan pengganti dokter
      </div>
    </div>`;
}

async function _fetchFoodFromGroq(phase, symptoms, flow) {
  const phaseNames = { mens:'Menstruasi', foll:'Folikular', ovul:'Ovulasi', lute:'Luteal' };
  const phaseName  = phaseNames[phase] || 'Menstruasi';

  const symsText = symptoms?.length ? ` Gejala yang dirasakan: ${symptoms.join(', ')}.` : '';
  const flowText = flow ? ` Aliran darah: ${flow}.` : '';

  const userPrompt =
    `Saya wanita Indonesia, sedang di fase ${phaseName} siklus menstruasi.` +
    flowText + symsText +
    ` Berikan tepat 5 rekomendasi makanan yang cocok, mudah ditemukan di Indonesia.` +
    ` Balas HANYA dengan JSON array, tanpa teks lain:` +
    ` [{"emoji":"🥬","nama":"Bayam","alasan":"Tinggi zat besi, bantu atasi anemia"}]`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'Kamu adalah ahli gizi kesehatan wanita Indonesia. ' +
              'Balas HANYA dengan JSON array yang valid. ' +
              'Tidak ada penjelasan, tidak ada markdown, tidak ada teks di luar JSON.'
          },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data  = await res.json();
    const reply = (data.reply || '').trim();

    /* Ekstrak JSON array dari reply */
    const match = reply.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length) {
        if (symptoms?.length) parsed._fromSymptoms = true;
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Food] Groq fetch error:', e.message);
  }
  return null;
}

function _fallbackFood(phase) {
  const fallbacks = {
    mens: [
      { emoji:'🥩', nama:'Daging merah',    alasan:'Tinggi zat besi — ganti darah yang keluar' },
      { emoji:'🐟', nama:'Ikan salmon',     alasan:'Omega-3 bantu kurangi peradangan & kram' },
      { emoji:'🍌', nama:'Pisang',          alasan:'Kalium & magnesium kurangi kram otot' },
      { emoji:'🫚', nama:'Tempe goreng',    alasan:'Protein nabati + zat besi sumber lokal' },
      { emoji:'🍫', nama:'Dark chocolate',  alasan:'Magnesium bantu mood & kurangi kram' },
    ],
    foll: [
      { emoji:'🥦', nama:'Brokoli',         alasan:'Folat & antioksidan untuk energi naik' },
      { emoji:'🥚', nama:'Telur',           alasan:'Protein lengkap untuk regenerasi sel' },
      { emoji:'🌾', nama:'Oatmeal',         alasan:'Karbohidrat kompleks, energi stabil' },
      { emoji:'🥑', nama:'Alpukat',         alasan:'Lemak sehat & folat mendukung ovulasi' },
      { emoji:'🫐', nama:'Blueberry',       alasan:'Antioksidan tinggi untuk vitalitas' },
    ],
    ovul: [
      { emoji:'🥬', nama:'Bayam',           alasan:'Zat besi & magnesium di puncak energi' },
      { emoji:'🫘', nama:'Edamame',         alasan:'Fitoestrogen alami yang baik di fase ini' },
      { emoji:'🍓', nama:'Strawberry',      alasan:'Vitamin C tinggi untuk imunitas & mood' },
      { emoji:'🐟', nama:'Tuna',            alasan:'Omega-3 dukung produksi hormon sehat' },
      { emoji:'🥜', nama:'Kacang almond',   alasan:'Vitamin E untuk kesehatan reproduksi' },
    ],
    lute: [
      { emoji:'🍠', nama:'Ubi jalar',       alasan:'Magnesium & B6 bantu PMS & mood stabil' },
      { emoji:'🌰', nama:'Kacang walnut',   alasan:'Omega-3 kurangi gejala PMS' },
      { emoji:'🍵', nama:'Teh chamomile',   alasan:'Anti-inflamasi, kurangi kecemasan' },
      { emoji:'🍊', nama:'Jeruk',           alasan:'Vitamin C & kalsium bantu mood PMS' },
      { emoji:'🌾', nama:'Nasi merah',      alasan:'Serat tinggi stabilkan gula darah & hormon' },
    ],
  };
  return fallbacks[phase] || fallbacks.mens;
}

/* ════════════════
   UI — CYCLE SCREEN RENDERS (existing)
════════════════ */
function renderPhaseCard(info) {
  const wrap = document.getElementById('phase-card-wrap');
  if (!info) {
    wrap.innerHTML = `<div class="phase-card none">
      <div class="phase-ring" style="background:var(--gl);font-size:38px">🌸</div>
      <div class="phase-name" style="color:var(--muted)">Belum ada data siklus</div>
      <div class="phase-title" style="color:var(--text);font-size:18px">Catat menstruasimu dulu yuk</div>
      <div class="phase-day" style="color:var(--muted)">Isi form di bawah ↓</div>
    </div>`;
    return;
  }
  const phase   = PHASES.find(p => p.id === info.phase);
  const daysLeft = info.len - info.dayOfCycle + 1;
  wrap.innerHTML = `<div class="phase-card ${info.phase}">
    <div class="phase-ring">${phase.emoji}</div>
    <div class="phase-name">Fase ${phase.name}</div>
    <div class="phase-title">Hari ke-${info.dayOfCycle}</div>
    <div class="phase-day">dari siklus ${info.len} hari · ${daysLeft} hari ke fase berikutnya</div>
  </div>`;
}

function renderCycleStrip(info) {
  const strip = document.getElementById('cycle-days');
  if (!info) { strip.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:8px 0">Belum ada data siklus.</div>'; return; }
  let html = '';
  for (let d = 1; d <= info.len; d++) {
    const phase   = getCyclePhase(d, info.len, info.dur);
    const isToday = info.dayOfCycle === d;
    const dotCls  = phase === 'mens' ? 'cd-dot-m' : phase === 'foll' ? 'cd-dot-f' : phase === 'ovul' ? 'cd-dot-o' : 'cd-dot-l';
    html += `<div class="cd ${phase}-d${isToday ? ' today-d' : ''}">
      <div class="cd-n">${d}</div>
      <div class="cd-dot ${dotCls}"></div>
    </div>`;
  }
  strip.innerHTML = html;
  setTimeout(() => {
    const el = strip.querySelector('.today-d');
    if (el) el.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
  }, 120);
}

function renderPhaseMiniCards(info) {
  const row = document.getElementById('phase-row');
  if (!info) { row.innerHTML = ''; return; }
  row.innerHTML = PHASES.map(p => {
    const active = info.phase === p.id;
    let dayRange = '—';
    const dur = info.dur, len = info.len;
    const follEnd = dur + Math.round((len - dur) * 0.35);
    const ovulEnd = follEnd + 3;
    if (p.id === 'mens')      dayRange = `H1–${dur}`;
    else if (p.id === 'foll') dayRange = `H${dur + 1}–${follEnd}`;
    else if (p.id === 'ovul') dayRange = `H${follEnd + 1}–${ovulEnd}`;
    else                       dayRange = `H${ovulEnd + 1}–${len}`;
    return `<div class="ph-mini ${p.id}"${active ? ' style="box-shadow:0 3px 12px rgba(0,0,0,.1)"' : ''}>
      <div class="ph-mini-ico">${p.emoji}</div>
      <div class="ph-mini-name ${p.id}">${p.name}</div>
      <div class="ph-mini-day">${dayRange}</div>
      ${active ? `<div class="ph-mini-tip" style="color:${p.color}">← Kamu di sini</div>` : ''}
    </div>`;
  }).join('');
}

/* renderPeriodHistory — sekarang tampilkan per-day flow dots ← DIUPDATE */
function renderPeriodHistory() {
  const el = document.getElementById('period-hist-list');
  if (!el) return;
  const sorted = [...periods].sort((a, b) => parseDateSafe(b.startDate) - parseDateSafe(a.startDate));
  if (!sorted.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:8px 0">Belum ada riwayat menstruasi yang dicatat.</div>';
    return;
  }
  el.innerHTML = sorted.slice(0, 8).map((p, i) => {
    const start = fmtDate(p.startDate);
    const end   = p.endDate ? fmtDate(p.endDate) : '?';
    const dur   = p.endDate ? diffDays(parseDateSafe(p.startDate), parseDateSafe(p.endDate)) + 1 : '?';

    /* Per-day flow dots ← BARU */
    const days = (periodDays[p.id] || []).sort((a, b) => a.date.localeCompare(b.date));
    const dailyHtml = days.length
      ? `<div class="ph-daily-row">
          ${days.map(d => {
            const dots    = FLOWS.find(f => f.l === d.flow)?.dots || 0;
            const cls     = dots >= 4 ? 'fd-vheavy' : dots >= 3 ? 'fd-heavy' : dots >= 2 ? 'fd-med' : 'fd-light';
            const symsStr = d.symptoms?.length ? ' · ' + d.symptoms.join(', ') : '';
            return `<div class="ph-day-col" title="${d.date}: ${d.flow || '—'}${symsStr}">
              <div class="ph-day-lbl">${fmtDateShort(d.date)}</div>
              <div class="ph-day-dots">
                ${'<div class="fd-mini ' + cls + '"></div>'.repeat(dots || 1)}
              </div>
            </div>`;
          }).join('')}
        </div>`
      : '';

    return `<div class="ph-row">
      <div class="ph-num">${sorted.length - i}</div>
      <div class="ph-info">
        <div class="ph-dates">🩸 ${start} – ${end}</div>
        <div class="ph-dur">${dur !== '?' ? dur + ' hari' : 'Belum selesai'}${p.flow ? ' · ' + p.flow : ''}${p.symptoms?.length ? ' · ' + p.symptoms.slice(0, 2).join(', ') : ''}</div>
        ${dailyHtml}
      </div>
      <div class="ph-acts">
        <div class="ph-act" onclick="window._editPeriod('${p.id}')" title="Edit">✏️</div>
        <div class="ph-act" onclick="window._deletePeriod('${p.id}')" title="Hapus">🗑</div>
      </div>
    </div>`;
  }).join('');
}

function renderLogCard() {
  const flowEl = document.getElementById('flow-row');
  const symEl  = document.getElementById('sym-grid');
  if (!flowEl || !symEl) return;

  flowEl.innerHTML = FLOWS.map((f, i) => `
    <div class="flow-btn${curFlow === i ? ' sel' : ''}" onclick="window._selectFlow(${i})">
      <div class="flow-dot-row">${'<div class="fd"></div>'.repeat(f.dots)}</div>
      ${f.l}
    </div>`).join('');

  symEl.innerHTML = SYMPTOMS.map((s, i) => `
    <div class="sym-btn${curSymptoms.includes(i) ? ' sel' : ''}" onclick="window._toggleSym(${i})">
      <span class="sym-e">${s.e}</span>
      <span class="sym-l">${s.l}</span>
    </div>`).join('');
}

function renderPredictions() {
  const pl = document.getElementById('pred-list');
  if (!pl) return;
  const preds = getPredictions();
  if (!preds.length) {
    pl.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:8px 0">Catat minimal 1 periode untuk prediksi.</div>';
    return;
  }
  pl.innerHTML = preds.map(p => {
    const du    = p.daysUntil;
    const badge = du === 0 ? `<b style="color:${p.color}">Hari ini!</b>`
      : du > 0 ? `<b style="color:${p.color}">${du} hari lagi</b>`
      : `<span style="color:var(--muted)">sudah lewat</span>`;
    return `<div class="pred-row">
      <div class="pred-dot" style="background:${p.color}"></div>
      <div class="pred-lbl">${p.label}</div>
      <div class="pred-date">${p.date} · ${badge}</div>
    </div>`;
  }).join('');
}

export function renderMoodPhaseCorr(entries, info) {
  const el = document.getElementById('corr-rows');
  if (!el) return;
  if (!info || !entries.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:8px 0">Data muncul setelah check-in dan punya riwayat siklus.</div>';
    return;
  }
  const phaseColors = { mens: '#ff6b8a', foll: '#f59e0b', ovul: '#8b5cf6', lute: '#3b82f6' };
  const phaseAvg    = { mens: [], foll: [], ovul: [], lute: [] };
  const lmp = info.lmp;
  entries.forEach(e => {
    const d = new Date(e.ts); d.setHours(0, 0, 0, 0);
    const daysSince  = diffDays(lmp, d);
    const dayOfCycle = ((daysSince % info.len) + info.len) % info.len + 1;
    const phase      = getCyclePhase(dayOfCycle, info.len, info.dur);
    if (phase && e.mood) phaseAvg[phase].push(e.mood.s);
  });

  el.innerHTML = PHASES.map(p => {
    const arr = phaseAvg[p.id];
    if (!arr.length) return `<div class="corr-row">
      <div class="corr-phase"><div class="corr-dot" style="background:${phaseColors[p.id]}"></div><div class="corr-name">${p.name}</div></div>
      <div style="flex:1;font-size:11px;color:var(--muted)">Belum ada data</div>
    </div>`;
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const pct = Math.round((avg / 5) * 100);
    return `<div class="corr-row">
      <div class="corr-phase"><div class="corr-dot" style="background:${phaseColors[p.id]}"></div><div class="corr-name">${p.name}</div></div>
      <div class="corr-bar-bg"><div class="corr-bar-fill" style="width:${pct}%;background:${phaseColors[p.id]}"></div></div>
      <div class="corr-val">${avg.toFixed(1)}</div>
    </div>`;
  }).join('');
}

function renderCycleTip(info) {
  const el = document.getElementById('cycle-tip');
  if (!el) return;
  if (!info) { el.textContent = 'Catat siklus pertamamu untuk mendapatkan tips yang personal 🌸'; return; }
  const phase = PHASES.find(p => p.id === info.phase);
  el.textContent = phase?.tip || '';
}

/* ════════════════
   CYCLE SETTINGS MODAL
════════════════ */
export function showCycleSetup() {
  document.getElementById('cyc-avg-len').value = cycleSettings.avgLen;
  document.getElementById('cyc-avg-dur').value = cycleSettings.avgDur;
  openModal('cycle-settings-modal');
}

export async function saveCycleSetupFromForm() {
  const len = parseInt(document.getElementById('cyc-avg-len').value) || 28;
  const dur = parseInt(document.getElementById('cyc-avg-dur').value) || 5;
  cycleSettings = {
    avgLen: Math.min(45, Math.max(21, len)),
    avgDur: Math.min(10, Math.max(2, dur)),
  };
  await saveCycleSettings(cycleSettings);
  closeModal('cycle-settings-modal');
}

/* ════════════════
   LOG PERIOD MODAL (existing)
════════════════ */
export function showLogPeriod(editId = null) {
  editingPeriodId = editId;
  curFlow = null; curSymptoms = [];

  if (editId) {
    const p = periods.find(x => x.id === editId);
    if (p) {
      document.getElementById('log-start').value = p.startDate;
      document.getElementById('log-end').value   = p.endDate || '';
      curFlow     = FLOWS.findIndex(f => f.l === p.flow);
      curSymptoms = (p.symptoms || []).map(s => SYMPTOMS.findIndex(x => x.l === s)).filter(i => i >= 0);
    }
  } else {
    const today = fmtDateInput(new Date());
    document.getElementById('log-start').value = today;
    document.getElementById('log-end').value   = '';
  }
  renderLogCard();
  openModal('log-period-modal');
}

export async function submitLogPeriod() {
  const startDate = document.getElementById('log-start').value;
  const endDate   = document.getElementById('log-end').value;
  if (!startDate) { alert('Pilih tanggal mulai dulu ya!'); return; }

  const data = {
    startDate,
    endDate: endDate || null,
    flow: curFlow !== null ? FLOWS[curFlow].l : null,
    symptoms: curSymptoms.map(i => SYMPTOMS[i].l),
  };

  if (editingPeriodId) {
    await updatePeriodEntry(editingPeriodId, data);
  } else {
    await logPeriod(data);
  }
  editingPeriodId = null;
  closeModal('log-period-modal');
}

/* ════════════════
   HOME BANNER
════════════════ */
export function renderHomeCycleBanner() {
  const el = document.getElementById('home-cycle-banner');
  if (!el) return;
  const info = getCurrentCycleInfo();
  if (!info) {
    el.className = 'cycle-banner none';
    el.innerHTML = `<div class="cb-ico">🌸</div>
      <div class="cb-body">
        <div class="cb-tag none">Cycle Tracker Baru!</div>
        <div class="cb-title">Mulai tracking siklus menstruasimu</div>
        <div class="cb-sub">Pahami hubungan mood & siklus →</div>
      </div><div class="cb-arr">›</div>`;
    return;
  }

  /* Cek apakah ada periode aktif dan belum log hari ini */
  const active   = getActivePeriod();
  const needsLog = active && !getTodayLog(active.id);

  const phase   = PHASES.find(p => p.id === info.phase);
  const titles  = {
    mens: 'Hari menstruasi — jaga dirimu ya 💗',
    foll: 'Energi mulai naik, yuk mulai sesuatu! 🌱',
    ovul: 'Puncak energi — manfaatkan momen ini ⭐',
    lute: 'Fase luteal — self-care dulu ya 🌙',
  };

  el.className = `cycle-banner ${info.phase}`;
  el.innerHTML = `<div class="cb-ico">${phase.emoji}</div>
    <div class="cb-body">
      <div class="cb-tag ${info.phase}">Fase ${phase.name} · H${info.dayOfCycle}</div>
      <div class="cb-title">${titles[info.phase]}</div>
      <div class="cb-sub">${needsLog ? '🩸 Belum isi log harian hari ini' : 'Lihat detail siklus →'}</div>
    </div>
    <div class="cb-arr" style="color:${phase.color}">${needsLog ? '🩸' : '›'}</div>`;
}

/* ════════════════
   INSIGHT MINI
════════════════ */
export function renderInsightCycleMini() {
  const el = document.getElementById('ins-cycle-mini-list');
  if (!el) return;
  const sorted = [...periods].sort((a, b) => parseDateSafe(b.startDate) - parseDateSafe(a.startDate));
  if (!sorted.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:6px 0">Belum ada riwayat siklus.</div>';
    return;
  }
  el.innerHTML = sorted.slice(0, 4).map(p => {
    const dur     = p.endDate ? diffDays(parseDateSafe(p.startDate), parseDateSafe(p.endDate)) + 1 : '?';
    const dayLogs = periodDays[p.id] || [];
    /* mini flow visualization */
    const flowMini = dayLogs.length
      ? dayLogs.sort((a,b) => a.date.localeCompare(b.date))
          .map(d => {
            const dots = FLOWS.find(f => f.l === d.flow)?.dots || 0;
            const cls  = dots >= 3 ? 'fd-heavy' : 'fd-med';
            return `<span class="fd-mini ${cls}" style="display:inline-block;margin-right:1px"></span>`.repeat(dots);
          }).join('<span style="display:inline-block;width:4px"></span>')
      : '';
    return `<div class="icm-row">
      <div class="icm-phase-dot" style="background:#ff6b8a"></div>
      <div class="icm-label">🩸 ${fmtDate(p.startDate)}${p.endDate ? ' – ' + fmtDate(p.endDate) : ''}</div>
      <div class="icm-syms">
        ${dur !== '?' ? dur + 'h' : '?'}${p.flow ? ' · ' + p.flow : ''}
        ${flowMini ? '<span style="margin-left:4px">' + flowMini + '</span>' : ''}
      </div>
    </div>`;
  }).join('');

  const info = getCurrentCycleInfo();
  if (info) {
    const preds = getPredictions();
    const next  = preds[0];
    if (next && next.daysUntil >= 0) {
      el.innerHTML += `<div class="icm-row" style="background:rgba(255,107,138,.04);border-radius:8px;margin-top:4px">
        <div class="icm-phase-dot" style="background:#ff6b8a;opacity:.4"></div>
        <div class="icm-label">Prediksi berikutnya</div>
        <div class="icm-syms" style="color:#ff6b8a;font-weight:700">${next.date} · ${next.daysUntil}h lagi</div>
      </div>`;
    }
  }
}

/* ════════════════
   WINDOW HANDLERS
════════════════ */
window._selectFlow  = (i) => { curFlow = i; renderLogCard(); };
window._toggleSym   = (i) => {
  const idx = curSymptoms.indexOf(i);
  if (idx >= 0) curSymptoms.splice(idx, 1); else curSymptoms.push(i);
  renderLogCard();
};
window._deletePeriod = async (id) => {
  window._moodlyConfirm({
    icon: '🗑', title: 'Hapus periode ini?',
    msg: 'Data menstruasi dan log harian-nya akan terhapus.',
    confirmTxt: 'Hapus', danger: true,
    onConfirm: async () => {
      await removePeriod(id);
      renderPeriodHistory();
      renderCycleStrip(getCurrentCycleInfo());
      renderPhaseCard(getCurrentCycleInfo());
      renderPredictions();
      renderDailyLogBanner();
    }
  });
};
window._editPeriod = (id) => showLogPeriod(id);

/* Daily log handlers ← BARU */
window._openDailyLog    = openDailyLog;
window._closeDailyLog   = () => closeModal('daily-log-modal');
window._submitDailyLog  = submitDailyLog;
window._selectDailyFlow = (i) => { dailyLogFlow = i; renderDailyLogModal(); };
window._toggleDailySym  = (i) => {
  const idx = dailyLogSymptoms.indexOf(i);
  if (idx >= 0) dailyLogSymptoms.splice(idx, 1); else dailyLogSymptoms.push(i);
  renderDailyLogModal();
};

/* Food recommendation handler ← BARU */
window._refreshFood = async () => {
  foodCache = null;
  localStorage.removeItem('moodly_food_cache');
  await renderFoodRecommendation(true);
};

/* ════════════════
   HELPERS
════════════════ */
function diffDays(a, b) { return Math.round((b - a) / 86400000); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmtDate(s) {
  const d = parseDateSafe(s);
  return d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '?';
}
function fmtDateShort(s) {
  const d = parseDateSafe(s);
  return d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' }) : '?';
}
function fmtDateInput(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateSafe(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function openModal(id)  { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }