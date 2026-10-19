/* ═══════════════════════════════════════
   MOODLY — cycle.js  v3
   • Tombol Mulai / Selesai Mens
   • Input per hari (flow + gejala)
   • PENGISIAN MUNDUR:
       - pilih tanggal mana pun dalam periode (strip tanggal di modal log)
       - isi hari yang terlewat, juga setelah periode selesai
       - catat periode lampau (lupa tekan Mulai)
       - pilih tanggal selesai (lupa tekan Selesai)
   • AI prediksi periode berikutnya (Groq)
   • AI makanan + minuman + kalimat motivasi
   ═══════════════════════════════════════ */

import {
  loadPeriods, addPeriod, updatePeriod, deletePeriod,
  loadPeriodDays, savePeriodDay,
  loadAIPredCache, saveAIPredCache,
  loadFoodCache, saveFoodCache,
} from '../firebase.js';

/* ══════════════════════════════
   CONSTANTS
══════════════════════════════ */
export const PHASES = [
  { id:'mens', name:'Menstruasi', emoji:'🩸', color:'#ff6b8a',
    tip:'Istirahat lebih banyak, minum air hangat, kompres perut jika kram. Mood mungkin lebih sensitif — itu wajar. Self-compassion dulu ya 💗' },
  { id:'foll', name:'Folikular',  emoji:'🌱', color:'#f59e0b',
    tip:'Energi mulai naik! Waktu terbaik untuk memulai proyek baru atau berolahraga lebih intens. Kamu di momentum terbaikmu ✨' },
  { id:'ovul', name:'Ovulasi',    emoji:'⭐', color:'#8b5cf6',
    tip:'Puncak energi dan kepercayaan diri! Waktu ideal untuk presentasi, bersosialisasi, atau aktivitas high-intensity 🌟' },
  { id:'lute', name:'Luteal',     emoji:'🌙', color:'#3b82f6',
    tip:'Energi mulai turun, PMS mungkin muncul. Prioritaskan self-care, kurangi kafein, dan jangan terlalu keras pada dirimu 🫂' },
];

export const SYMPTOMS = [
  {e:'😣',l:'Kram'},         {e:'🤕',l:'Sakit kepala'}, {e:'😪',l:'Lelah'},
  {e:'🤢',l:'Mual'},         {e:'😤',l:'Mood swing'},   {e:'🫃',l:'Kembung'},
  {e:'😴',l:'Ngantuk'},      {e:'🍫',l:'Ngidam'},       {e:'😢',l:'Emosional'},
  {e:'🔥',l:'Nyeri punggung'},{e:'😬',l:'Jerawat'},     {e:'💤',l:'Insomnia'},
];

export const FLOWS = [
  {l:'Sedikit',dots:1}, {l:'Sedang',dots:2},
  {l:'Deras',  dots:3}, {l:'Sangat deras',dots:4},
];

const FLOW_COLORS = ['#e5e7eb', '#ffc2cf', '#ff9db3', '#ff6b8a', '#d6336c'];
const MAX_ACTIVE_DAYS = 20;   // periode tanpa tanggal selesai dianggap "aktif" maks segini
const MAX_RANGE_DAYS  = 31;   // batas jumlah hari yang ditampilkan di strip tanggal

/* ══════════════════════════════
   STATE
══════════════════════════════ */
let periods     = [];
let periodDays  = {};   // { [periodId]: [{date, flow, symptoms}] }

let dailyLogFlow     = null;
let dailyLogSymptoms = [];
let editingDayDate   = null;
let editingPeriodId  = null;

let backfillOpen    = false;   // form "catat periode sebelumnya"
let endPickerOpen   = false;   // pilih tanggal selesai manual
let startPickerOpen = false;   // pilihan tanggal mulai mundur

let aiPredCache  = null;
let aiPredLoading= false;
let foodCache    = null;
let foodLoading  = false;

/* ══════════════════════════════
   INIT
══════════════════════════════ */
export async function initCycle() {
  ensureStyles();
  const pds = await loadPeriods();
  periods = pds || [];

  // Load daily logs untuk 10 periode terbaru
  const recent = [...periods]
    .sort((a,b) => parseDateSafe(b.startDate) - parseDateSafe(a.startDate))
    .slice(0, 10);
  await Promise.all(recent.map(async p => {
    if (p.id) periodDays[p.id] = await loadPeriodDays(p.id);
  }));

  aiPredCache = await loadAIPredCache();
  foodCache   = await loadFoodCache();
}

export function getPeriods()       { return periods; }

/* ══════════════════════════════
   CYCLE ENGINE  (math fallback)
══════════════════════════════ */
function calcAvgCycleLen() {
  const completed = periods.filter(p => p.endDate);
  if (completed.length < 2) return 28;
  const sorted = [...completed].sort((a,b) => parseDateSafe(a.startDate) - parseDateSafe(b.startDate));
  let tot = 0, cnt = 0;
  for (let i = 1; i < sorted.length; i++) {
    const d = diffDays(parseDateSafe(sorted[i-1].startDate), parseDateSafe(sorted[i].startDate));
    if (d >= 18 && d <= 50) { tot += d; cnt++; }
  }
  return cnt ? Math.round(tot/cnt) : 28;
}
function calcAvgDuration() {
  const w = periods.filter(p => p.endDate);
  if (!w.length) return 5;
  const avg = w.reduce((s,p) => s + diffDays(parseDateSafe(p.startDate), parseDateSafe(p.endDate)) + 1, 0) / w.length;
  return Math.round(avg);
}
function getLastCompletedPeriod() {
  return [...periods].filter(p => p.endDate)
    .sort((a,b) => parseDateSafe(b.startDate) - parseDateSafe(a.startDate))[0] || null;
}
export function getCurrentCycleInfo() {
  const last = getLastCompletedPeriod();
  if (!last) return null;
  const len = calcAvgCycleLen();
  const dur = calcAvgDuration();
  const lmp = parseDateSafe(last.startDate); lmp.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const daysSince  = diffDays(lmp, today);
  const dayOfCycle = ((daysSince % len) + len) % len + 1;
  const phase      = getCyclePhase(dayOfCycle, len, dur);
  return { dayOfCycle, phase, lmp, len, dur };
}
export function getCyclePhase(dayOfCycle, len, dur) {
  const follEnd = dur + Math.round((len - dur) * 0.35);
  const ovulEnd = follEnd + 3;
  if (dayOfCycle <= dur)     return 'mens';
  if (dayOfCycle <= follEnd) return 'foll';
  if (dayOfCycle <= ovulEnd) return 'ovul';
  return 'lute';
}

/* ══════════════════════════════
   PERIOD HELPERS
══════════════════════════════ */
export function getActivePeriod() {
  const today = fmtDateInput(new Date());
  return periods.find(p => {
    if (!p.startDate || p.startDate > today) return false;
    if (p.endDate) return false;   // sudah selesai
    // aktif maksimal 20 hari ke depan
    return diffDays(parseDateSafe(p.startDate), new Date()) <= MAX_ACTIVE_DAYS;
  }) || null;
}
function getDayOfPeriod(period) {
  const start = parseDateSafe(period.startDate);
  const today = new Date(); today.setHours(0,0,0,0);
  return diffDays(start, today) + 1;
}
function getDayNumberOn(period, dateStr) {
  return diffDays(parseDateSafe(period.startDate), parseDateSafe(dateStr)) + 1;
}
function getLog(periodId, dateStr) {
  return (periodDays[periodId] || []).find(d => d.date === dateStr) || null;
}
function getTodayLog(periodId) {
  return getLog(periodId, fmtDateInput(new Date()));
}

/**
 * Daftar tanggal (YYYY-MM-DD) dalam sebuah periode — dari hari pertama
 * sampai tanggal selesai (atau hari ini jika belum selesai). Maks 31 hari.
 */
function getPeriodDates(period) {
  const todayStr = fmtDateInput(new Date());
  let endStr = period.endDate || todayStr;
  if (endStr > todayStr) endStr = todayStr;
  const start = parseDateSafe(period.startDate);
  if (!start) return [];
  const out = [];
  for (let i = 0; i < MAX_RANGE_DAYS; i++) {
    const ds = fmtDateInput(addDays(start, i));
    if (ds > endStr) break;
    out.push(ds);
  }
  return out;
}
function getMissingDates(period) {
  return getPeriodDates(period).filter(ds => !getLog(period.id, ds));
}

/** Akhir efektif sebuah periode (untuk cek tabrakan tanggal). */
function effectiveEnd(p) {
  if (p.endDate) return p.endDate;
  const todayStr = fmtDateInput(new Date());
  return p === getActivePeriod() ? todayStr : p.startDate;
}
function overlapsExisting(startStr, endStr, ignoreId = null) {
  return periods.some(p => {
    if (p.id === ignoreId || !p.startDate) return false;
    return startStr <= effectiveEnd(p) && endStr >= p.startDate;
  });
}

/** Render ulang semua bagian layar siklus (tanpa memaksa refresh makanan). */
function refreshAll() {
  const info = getCurrentCycleInfo();
  renderPhaseCard(info);
  renderMensActionButton();
  renderDailyLogBanner();
  renderCycleStrip(info);
  renderPhaseMiniCards(info);
  renderPeriodHistory();
  renderCycleTip(info);
  renderAIPrediction(true);
  renderFoodRecommendation();
}

/* ══════════════════════════════
   ACTIONS: MULAI / SELESAI
══════════════════════════════ */
export async function startPeriod(customStartDate = null) {
  if (getActivePeriod()) {
    window._moodlyToast?.('Periode aktif sudah ada! Tap Selesai dulu.');
    return;
  }
  const startDate = customStartDate || fmtDateInput(new Date());
  if (overlapsExisting(startDate, startDate)) {
    window._moodlyToast?.('Tanggal tersebut sudah masuk ke periode lain.');
    return;
  }
  const id = await addPeriod({ startDate, endDate: null });
  periods.unshift({ id, startDate, endDate: null });
  periodDays[id] = [];

  backfillOpen = false;
  renderMensActionButton();
  renderDailyLogBanner();
  renderPeriodHistory();

  window._moodlyToast?.(`Periode baru dimulai (${fmtDate(startDate)}) 🌸`);
  // Langsung buka daily log untuk tanggal mulai
  setTimeout(() => openDailyLog(id, startDate), 250);
}

export async function stopPeriod() {
  const active = getActivePeriod();
  if (!active) { window._moodlyToast?.('Tidak ada periode aktif.'); return; }

  const dayNum = getDayOfPeriod(active);
  window._moodlyConfirm({
    icon: '🌸',
    title: 'Menstruasi selesai?',
    msg: `Periode hari ke-${dayNum} (mulai ${fmtDate(active.startDate)}). Kapan menstruasimu selesai?`,
    confirmTxt: 'Selesai Hari Ini ✓',
    cancelTxt: 'Pilih Tanggal Lain',
    onConfirm: async () => {
      await setPeriodEnd(active.id, fmtDateInput(new Date()), true);
    },
    onCancel: () => {
      endPickerOpen = true;
      renderMensActionButton();
    }
  });
}

/**
 * Set tanggal selesai untuk periode tertentu (boleh tanggal lampau).
 * Dipakai oleh tombol Selesai, picker tanggal, dan history.
 */
async function setPeriodEnd(periodId, endStr, silent = false) {
  const p = periods.find(x => x.id === periodId);
  if (!p) return false;
  const todayStr = fmtDateInput(new Date());

  if (!endStr)               { window._moodlyToast?.('Pilih tanggal selesai dulu.'); return false; }
  if (endStr < p.startDate)  { window._moodlyToast?.('Tanggal selesai tidak boleh sebelum tanggal mulai.'); return false; }
  if (endStr > todayStr)     { window._moodlyToast?.('Tanggal selesai tidak boleh di masa depan.'); return false; }
  if (diffDays(parseDateSafe(p.startDate), parseDateSafe(endStr)) + 1 > MAX_RANGE_DAYS) {
    window._moodlyToast?.(`Durasi periode maksimal ${MAX_RANGE_DAYS} hari.`); return false;
  }
  if (overlapsExisting(p.startDate, endStr, p.id)) {
    window._moodlyToast?.('Tanggal tersebut bertabrakan dengan periode lain.'); return false;
  }

  await updatePeriod(p.id, { endDate: endStr });
  p.endDate = endStr;
  endPickerOpen = false;

  refreshAll();
  if (!silent) window._moodlyToast?.('Tanggal selesai tersimpan ✓');
  else         window._moodlyToast?.('Periode selesai dicatat ✓');

  // Tawarkan isi hari yang terlewat
  const missing = getMissingDates(p).length;
  if (missing > 0) {
    setTimeout(() => window._moodlyToast?.(`Ada ${missing} hari belum diisi — tap 📝 di riwayat untuk isi mundur`), 1800);
  }
  return true;
}

/**
 * Catat periode lampau (lupa tekan Mulai). Tanggal selesai opsional:
 * kosong = periode masih berlangsung (hanya boleh jika mulai ≤ 20 hari lalu).
 */
async function submitBackfillPeriod() {
  const startStr = document.getElementById('bf-start')?.value || '';
  const endStr   = document.getElementById('bf-end')?.value   || '';
  const todayStr = fmtDateInput(new Date());

  if (!startStr)            { window._moodlyToast?.('Isi tanggal mulai dulu.'); return; }
  if (startStr > todayStr)  { window._moodlyToast?.('Tanggal mulai tidak boleh di masa depan.'); return; }
  if (endStr) {
    if (endStr < startStr)  { window._moodlyToast?.('Tanggal selesai tidak boleh sebelum tanggal mulai.'); return; }
    if (endStr > todayStr)  { window._moodlyToast?.('Tanggal selesai tidak boleh di masa depan.'); return; }
    if (diffDays(parseDateSafe(startStr), parseDateSafe(endStr)) + 1 > MAX_RANGE_DAYS) {
      window._moodlyToast?.(`Durasi periode maksimal ${MAX_RANGE_DAYS} hari.`); return;
    }
  } else {
    if (diffDays(parseDateSafe(startStr), new Date()) > MAX_ACTIVE_DAYS) {
      window._moodlyToast?.('Mulai sudah lama — isi juga tanggal selesainya ya.'); return;
    }
    if (getActivePeriod()) {
      window._moodlyToast?.('Sudah ada periode aktif. Selesaikan dulu atau isi tanggal selesai.'); return;
    }
  }
  if (overlapsExisting(startStr, endStr || startStr)) {
    window._moodlyToast?.('Tanggal tersebut bertabrakan dengan periode yang sudah ada.'); return;
  }

  const id = await addPeriod({ startDate: startStr, endDate: endStr || null });
  periods.unshift({ id, startDate: startStr, endDate: endStr || null });
  periodDays[id] = [];
  backfillOpen = false;

  refreshAll();
  window._moodlyToast?.('Periode tersimpan ✓ — isi log hariannya ya');
  setTimeout(() => openDailyLog(id), 300);
}

/* ══════════════════════════════
   RENDER — MAIN SCREEN
══════════════════════════════ */
export function renderCycleScreen(entries = []) {
  ensureStyles();
  const info = getCurrentCycleInfo();
  renderPhaseCard(info);
  renderMensActionButton();
  renderDailyLogBanner();
  renderCycleStrip(info);
  renderPhaseMiniCards(info);
  renderPeriodHistory();
  renderMoodPhaseCorr(entries, info);
  renderCycleTip(info);
  renderAIPrediction();
  renderFoodRecommendation();
}

/* ──────────── Phase card ──────────── */
function renderPhaseCard(info) {
  const wrap = document.getElementById('phase-card-wrap');
  if (!wrap) return;
  const active = getActivePeriod();
  if (active) {
    const dayNum = getDayOfPeriod(active);
    const todayLog = getTodayLog(active.id);
    const flowTxt = todayLog?.flow ? ` · ${todayLog.flow}` : '';
    wrap.innerHTML = `<div class="phase-card mens">
      <div class="phase-ring">🩸</div>
      <div class="phase-name">Sedang Menstruasi</div>
      <div class="phase-title">Hari ke-${dayNum}</div>
      <div class="phase-day">Mulai ${fmtDate(active.startDate)}${flowTxt}</div>
    </div>`;
    return;
  }
  if (!info) {
    wrap.innerHTML = `<div class="phase-card none">
      <div class="phase-ring" style="background:var(--gl);font-size:38px">🌸</div>
      <div class="phase-name" style="color:var(--muted)">Belum ada data siklus</div>
      <div class="phase-title" style="color:var(--text);font-size:18px">Tap tombol di bawah untuk mulai</div>
      <div class="phase-day" style="color:var(--muted)">Tracking dimulai dari hari pertama mensmu</div>
    </div>`;
    return;
  }
  const phase    = PHASES.find(p => p.id === info.phase);
  const daysLeft = info.len - info.dayOfCycle + 1;
  wrap.innerHTML = `<div class="phase-card ${info.phase}">
    <div class="phase-ring">${phase.emoji}</div>
    <div class="phase-name">Fase ${phase.name}</div>
    <div class="phase-title">Hari ke-${info.dayOfCycle}</div>
    <div class="phase-day">dari siklus ${info.len} hari · ${daysLeft} hari ke fase berikutnya</div>
  </div>`;
}

/* ──────────── Mulai / Selesai button ──────────── */
function renderMensActionButton() {
  const el = document.getElementById('mens-action-wrap');
  if (!el) return;
  const active   = getActivePeriod();
  const todayStr = fmtDateInput(new Date());

  if (active) {
    const dayNum       = getDayOfPeriod(active);
    const todayLog     = getTodayLog(active.id);
    const needsLog     = !todayLog;
    const missingDates = getMissingDates(active);

    const overdueAlert = dayNum >= 7 ? `
      <div class="bf-overdue-box">
        <div class="bf-overdue-title">⚠️ Periode sudah berjalan ${dayNum} hari</div>
        <div class="bf-overdue-desc">Sudah selesai kemarin atau beberapa hari lalu? Langsung selesaikan di sini:</div>
        <div class="bf-quick-btns">
          <button type="button" class="bf-qbtn" onclick="window._stopPeriodYesterday()">Selesai Kemarin</button>
          <button type="button" class="bf-qbtn" onclick="window._toggleEndPicker()">Pilih Tanggal Selesai</button>
        </div>
      </div>
    ` : '';

    const endPicker = endPickerOpen ? `
      <div class="bf-form">
        <label class="bf-lbl">Pilih tanggal selesai menstruasi:</label>
        <input type="date" id="end-date-input" class="bf-input"
               min="${active.startDate}" max="${todayStr}" value="${todayStr}">
        <div class="bf-quick-btns" style="margin-top:6px">
          <button type="button" class="bf-qbtn" onclick="document.getElementById('end-date-input').value='${todayStr}'">Hari Ini</button>
          <button type="button" class="bf-qbtn" onclick="window._setEndDateInputYesterday()">Kemarin</button>
        </div>
        <button class="bf-save" onclick="window._submitEndDate()">Simpan Tanggal Selesai</button>
      </div>` : '';

    el.innerHTML = `
      ${overdueAlert}
      <div class="mens-active-row">
        <div class="mar-info">
          <div class="mar-badge">🩸 Menstruasi Hari ke-${dayNum}</div>
          ${needsLog
            ? '<div class="mar-sub" style="color:var(--mens)">Belum isi log hari ini ↓</div>'
            : `<div class="mar-sub">${todayLog.flow || 'Log tercatat'} ✓</div>`}
        </div>
        <button class="mens-stop-btn" onclick="window._stopPeriod()">
          ✓ Selesai
        </button>
      </div>
      <div class="bf-actions-row">
        <button class="bf-sub-btn" onclick="window._toggleEndPicker()">
          ${endPickerOpen ? '✕ Tutup Picker' : '📅 Lupa Selesai? Pilih Tanggal Selesai'}
        </button>
        ${missingDates.length ? `
          <button class="bf-sub-btn missing-btn" onclick="window._openDailyLogDate('${active.id}', '${missingDates[0]}')">
            📝 Isi Hari Terlewat (${missingDates.length} hari)
          </button>
        ` : ''}
      </div>
      ${endPicker}`;
  } else {
    const startPicker = startPickerOpen ? `
      <div class="bf-form">
        <label class="bf-lbl">Kapan menstruasimu mulai?</label>
        <input type="date" id="start-date-input" class="bf-input" max="${todayStr}" value="${todayStr}">
        <div class="bf-quick-btns" style="margin-top:6px">
          <button type="button" class="bf-qbtn" onclick="window._quickStartPeriod(0)">Hari Ini</button>
          <button type="button" class="bf-qbtn" onclick="window._quickStartPeriod(1)">Kemarin</button>
          <button type="button" class="bf-qbtn" onclick="window._quickStartPeriod(2)">2 Hari Lalu</button>
          <button type="button" class="bf-qbtn" onclick="window._quickStartPeriod(3)">3 Hari Lalu</button>
        </div>
        <button class="bf-save" onclick="window._submitCustomStart()">Mulai Periode Sekarang</button>
      </div>` : '';

    const backfillForm = backfillOpen ? `
      <div class="bf-form">
        <label class="bf-lbl"><b>Catat Periode Lampau yang Terlewat</b></label>
        <label class="bf-lbl" style="margin-top:4px">Tanggal mulai</label>
        <input type="date" id="bf-start" class="bf-input" max="${todayStr}">
        <label class="bf-lbl">Tanggal selesai <span style="opacity:.6">(kosongkan jika masih berlangsung)</span></label>
        <input type="date" id="bf-end" class="bf-input" max="${todayStr}">
        <div class="bf-quick-btns" style="margin-top:6px">
          <button type="button" class="bf-qbtn" onclick="window._quickPresetBackfill(7, 5)">1 Minggu Lalu (5 Hari)</button>
          <button type="button" class="bf-qbtn" onclick="window._quickPresetBackfill(14, 5)">2 Minggu Lalu (5 Hari)</button>
        </div>
        <button class="bf-save" onclick="window._submitBackfill()">Simpan & Lengkapi Data</button>
      </div>` : '';

    el.innerHTML = `
      <div class="mens-action-group">
        <button class="mens-start-btn" onclick="window._promptStartPeriod()">
          🩸 Mulai Menstruasi
        </button>
        <button class="mens-backfill-btn" onclick="window._toggleBackfill()">
          📅 Catat Mundur / Kelewat
        </button>
      </div>
      ${startPicker}
      ${backfillForm}`;
  }
}

/* ──────────── Daily log banner ──────────── */
function renderDailyLogBanner() {
  const el = document.getElementById('daily-log-banner');
  if (!el) return;
  const active = getActivePeriod();
  if (!active) { el.innerHTML = ''; return; }

  const dayNum   = getDayOfPeriod(active);
  const todayStr = fmtDateInput(new Date());
  const todayLog = getTodayLog(active.id);

  // hari sebelumnya yang belum diisi (tidak termasuk hari ini)
  const missingPast = getMissingDates(active).filter(ds => ds !== todayStr);
  const missingHtml = missingPast.length
    ? `<div class="db-sub" style="color:var(--mens);margin-top:4px">
         ${missingPast.length} hari terlewat ·
         <u onclick="event.stopPropagation();window._openDailyLogDate('${active.id}','${missingPast[0]}')">isi mundur</u>
       </div>` : '';

  if (todayLog) {
    const dots     = FLOWS.find(f => f.l === todayLog.flow)?.dots || 0;
    const dotsHtml = '<span class="fd fd-pink"></span>'.repeat(dots);
    const syms     = (todayLog.symptoms || []).slice(0, 3)
      .map(s => `<span class="db-chip">${s}</span>`).join('');
    el.innerHTML = `
      <div class="daily-banner daily-banner-done" onclick="window._openDailyLog()">
        <div class="db-icon">🩸</div>
        <div class="db-body">
          <div class="db-day">Hari ke-${dayNum} · Log Harian</div>
          <div class="db-status">${dotsHtml} <b>${todayLog.flow || ''}</b></div>
          ${syms ? `<div class="db-chips">${syms}</div>` : ''}
          ${missingHtml}
        </div>
        <div class="db-edit-btn">Edit ›</div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="daily-banner daily-banner-prompt" onclick="window._openDailyLog()">
        <div class="db-icon">🩸</div>
        <div class="db-body">
          <div class="db-day">Hari ke-${dayNum} Menstruasi</div>
          <div class="db-sub">Seberapa deras hari ini? Ada gejala apa?</div>
          ${missingHtml}
        </div>
        <button class="db-fill-btn">Isi ›</button>
      </div>`;
  }
}

/* ──────────── Cycle strip ──────────── */
function renderCycleStrip(info) {
  const strip = document.getElementById('cycle-days');
  if (!strip) return;
  if (!info) { strip.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:8px 0">Data muncul setelah periode pertama selesai.</div>'; return; }
  let html = '';
  for (let d = 1; d <= info.len; d++) {
    const phase   = getCyclePhase(d, info.len, info.dur);
    const isToday = info.dayOfCycle === d;
    const dotCls  = {mens:'cd-dot-m', foll:'cd-dot-f', ovul:'cd-dot-o', lute:'cd-dot-l'}[phase];
    html += `<div class="cd ${phase}-d${isToday ? ' today-d' : ''}">
      <div class="cd-n">${d}</div>
      <div class="cd-dot ${dotCls}"></div>
    </div>`;
  }
  strip.innerHTML = html;
  setTimeout(() => { const el = strip.querySelector('.today-d'); if (el) el.scrollIntoView({ inline:'center', behavior:'smooth', block:'nearest' }); }, 120);
}

/* ──────────── Phase mini cards ──────────── */
function renderPhaseMiniCards(info) {
  const row = document.getElementById('phase-row');
  if (!row) return;
  if (!info) { row.innerHTML = ''; return; }
  row.innerHTML = PHASES.map(p => {
    const active  = info.phase === p.id;
    const dur = info.dur, len = info.len;
    const follEnd = dur + Math.round((len - dur) * 0.35);
    const ovulEnd = follEnd + 3;
    const ranges  = { mens:`H1–${dur}`, foll:`H${dur+1}–${follEnd}`, ovul:`H${follEnd+1}–${ovulEnd}`, lute:`H${ovulEnd+1}–${len}` };
    return `<div class="ph-mini ${p.id}"${active ? ' style="box-shadow:0 3px 12px rgba(0,0,0,.1)"' : ''}>
      <div class="ph-mini-ico">${p.emoji}</div>
      <div class="ph-mini-name ${p.id}">${p.name}</div>
      <div class="ph-mini-day">${ranges[p.id]}</div>
      ${active ? `<div class="ph-mini-tip" style="color:${p.color}">← Kamu di sini</div>` : ''}
    </div>`;
  }).join('');
}

/* ──────────── Period history ──────────── */
function renderPeriodHistory() {
  const el = document.getElementById('period-hist-list');
  if (!el) return;
  const sorted = [...periods].sort((a,b) => parseDateSafe(b.startDate) - parseDateSafe(a.startDate));
  if (!sorted.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:8px 0">Belum ada riwayat. Tap "Mulai Menstruasi" untuk memulai tracking!</div>';
    return;
  }
  const active   = getActivePeriod();
  const todayStr = fmtDateInput(new Date());

  el.innerHTML = sorted.slice(0, 8).map((p, i) => {
    const isActive = active && active.id === p.id;
    const start = fmtDate(p.startDate);
    const end   = p.endDate ? fmtDate(p.endDate) : (isActive ? '— (aktif)' : '— (belum diatur)');
    const dur   = p.endDate
      ? diffDays(parseDateSafe(p.startDate), parseDateSafe(p.endDate)) + 1
      : (isActive ? getDayOfPeriod(p) : null);

    // Chip per hari — bisa diklik untuk isi / edit (termasuk hari yang terlewat)
    const dates = getPeriodDates(p);
    const dayHtml = dates.length
      ? `<div class="ph-daily-row">
          ${dates.map(ds => {
            const log   = getLog(p.id, ds);
            const dots  = FLOWS.find(f => f.l === log?.flow)?.dots || 0;
            const color = log ? FLOW_COLORS[dots] : null;
            const tip   = log
              ? `${fmtDateShort(ds)}: ${log.flow || '—'}${log.symptoms?.length ? ' · ' + log.symptoms.join(', ') : ''}`
              : `${fmtDateShort(ds)}: belum diisi — tap untuk isi`;
            return `<div class="ph-day-col bf-chip${log ? ' filled' : ' missing'}" title="${tip}"
                         onclick="window._openDailyLogDate('${p.id}','${ds}')">
              <div class="bf-chip-dot" style="${color ? `background:${color}` : ''}"></div>
              <div class="ph-day-lbl">${fmtDateShort(ds)}</div>
            </div>`;
          }).join('')}
        </div>` : '';

    const missingCnt = dates.filter(ds => !getLog(p.id, ds)).length;
    const missingTxt = missingCnt
      ? `<div class="ph-dur" style="color:var(--mens)">${missingCnt} hari belum diisi — tap tanggal untuk isi mundur</div>` : '';

    // Periode belum punya tanggal selesai & bukan periode aktif → minta tanggal selesai
    const endFix = (!p.endDate && !isActive) ? `
      <div class="bf-form" style="margin-top:6px">
        <label class="bf-lbl">Tanggal selesai periode ini</label>
        <input type="date" id="end-${p.id}" class="bf-input" min="${p.startDate}" max="${todayStr}">
        <button class="bf-save" onclick="window._setEndFromInput('${p.id}')">Simpan</button>
      </div>` : '';

    return `<div class="ph-row">
      <div class="ph-num">${sorted.length - i}</div>
      <div class="ph-info">
        <div class="ph-dates">🩸 ${start} – ${end}</div>
        <div class="ph-dur">${dur ? dur + ' hari' : '? hari'}${p.endDate || !isActive ? '' : ' (belum selesai)'}</div>
        ${missingTxt}
        ${dayHtml}
        ${endFix}
      </div>
      <div class="ph-acts">
        <div class="ph-act" onclick="window._editPeriodDay('${p.id}')" title="Isi / edit log harian">📝</div>
        <div class="ph-act" onclick="window._deletePeriod('${p.id}')" title="Hapus">🗑</div>
      </div>
    </div>`;
  }).join('');
}

/* ──────────── Mood-phase corr ──────────── */
export function renderMoodPhaseCorr(entries, info) {
  const el = document.getElementById('corr-rows');
  if (!el) return;
  if (!info || !entries.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:8px 0">Data muncul setelah check-in dan punya riwayat siklus.</div>';
    return;
  }
  const phaseColors = { mens:'#ff6b8a', foll:'#f59e0b', ovul:'#8b5cf6', lute:'#3b82f6' };
  const phaseAvg    = { mens:[], foll:[], ovul:[], lute:[] };
  entries.forEach(e => {
    const d = new Date(e.ts); d.setHours(0,0,0,0);
    const ds = diffDays(info.lmp, d);
    const dc = ((ds % info.len) + info.len) % info.len + 1;
    const ph = getCyclePhase(dc, info.len, info.dur);
    if (ph && e.mood) phaseAvg[ph].push(e.mood.s);
  });
  el.innerHTML = PHASES.map(p => {
    const arr = phaseAvg[p.id];
    if (!arr.length) return `<div class="corr-row">
      <div class="corr-phase"><div class="corr-dot" style="background:${phaseColors[p.id]}"></div><div class="corr-name">${p.name}</div></div>
      <div style="flex:1;font-size:11px;color:var(--muted)">Belum ada data</div>
    </div>`;
    const avg = arr.reduce((a,b) => a+b, 0) / arr.length;
    return `<div class="corr-row">
      <div class="corr-phase"><div class="corr-dot" style="background:${phaseColors[p.id]}"></div><div class="corr-name">${p.name}</div></div>
      <div class="corr-bar-bg"><div class="corr-bar-fill" style="width:${Math.round((avg/5)*100)}%;background:${phaseColors[p.id]}"></div></div>
      <div class="corr-val">${avg.toFixed(1)}</div>
    </div>`;
  }).join('');
}

/* ──────────── Cycle tip ──────────── */
function renderCycleTip(info) {
  const el = document.getElementById('cycle-tip');
  if (!el) return;
  if (!info) { el.textContent = 'Catat siklus pertamamu untuk mendapatkan tips yang personal 🌸'; return; }
  const phase = PHASES.find(p => p.id === info.phase);
  el.textContent = phase?.tip || '';
}

/* ══════════════════════════════
   AI PREDICTION  (Groq)
══════════════════════════════ */
export async function renderAIPrediction(forceRefresh = false) {
  const el = document.getElementById('ai-prediction-card');
  if (!el) return;

  const completed = periods.filter(p => p.endDate);
  const active    = getActivePeriod();

  if (!completed.length && !active) {
    el.innerHTML = `
      <div class="ai-pred-empty">
        <div class="ape-ico">🔮</div>
        <div class="ape-title">Prediksi AI</div>
        <div class="ape-sub">Catat setidaknya 1 periode yang selesai<br>untuk mendapat prediksi cerdas dari AI</div>
      </div>`;
    return;
  }

  const today = new Date().toDateString();
  if (!forceRefresh && aiPredCache?.date === today && aiPredCache?.data) {
    _renderAIPredData(el, aiPredCache.data);
    return;
  }
  if (aiPredLoading) return;
  aiPredLoading = true;

  el.innerHTML = `
    <div class="ai-pred-loading">
      <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
      <div style="font-size:12px;color:var(--muted);margin-top:8px">AI memprediksi siklus berikutnya…</div>
    </div>`;

  const data = await _fetchAIPrediction(completed, active);
  aiPredLoading = false;

  if (data) {
    aiPredCache = { date: today, data };
    await saveAIPredCache({ date: today, data });
    _renderAIPredData(el, data);
  } else {
    _renderAIPredFallback(el);
  }
}

function _renderAIPredData(el, d) {
  const daysUntil = typeof d.daysUntil === 'number' ? d.daysUntil : '?';
  const badge = daysUntil === 0 ? '<b style="color:var(--mens)">Hari ini!</b>'
    : daysUntil > 0 ? `<b style="color:var(--mens)">${daysUntil} hari lagi</b>`
    : daysUntil < 0 ? `<span style="color:var(--muted)">Mungkin sudah mulai?</span>` : '';

  el.innerHTML = `
    <div class="ai-pred-card">
      <div class="apc-header">
        <div class="apc-title-row">
          <span class="apc-badge">🔮 Prediksi AI</span>
          <button class="apc-refresh" onclick="window._refreshAIPred()">↻</button>
        </div>
        <div class="apc-motivasi">${d.motivasi || ''}</div>
      </div>
      <div class="apc-rows">
        <div class="apc-row apc-row-mens">
          <div class="apc-row-icon">🩸</div>
          <div class="apc-row-body">
            <div class="apc-row-label">Menstruasi berikutnya</div>
            <div class="apc-row-val">${d.prediksi || '—'}</div>
            <div class="apc-row-sub">${badge}</div>
          </div>
        </div>
        ${d.fertile ? `<div class="apc-row apc-row-fert">
          <div class="apc-row-icon">🌸</div>
          <div class="apc-row-body">
            <div class="apc-row-label">Fertile window perkiraan</div>
            <div class="apc-row-val">${d.fertile}</div>
          </div>
        </div>` : ''}
        ${d.catatan ? `<div class="apc-note">${d.catatan}</div>` : ''}
      </div>
    </div>`;
}

function _renderAIPredFallback(el) {
  const last      = periods.filter(p => p.endDate).sort((a,b) => parseDateSafe(b.startDate) - parseDateSafe(a.startDate))[0];
  const avgLen    = calcAvgCycleLen();
  const avgDur    = calcAvgDuration();
  const today     = new Date(); today.setHours(0,0,0,0);

  if (!last) { el.innerHTML = ''; return; }

  const lmp       = parseDateSafe(last.startDate); lmp.setHours(0,0,0,0);
  const passed    = diffDays(lmp, today);
  const cycles    = Math.floor(passed / avgLen);
  let nextStart   = addDays(lmp, (cycles + 1) * avgLen);
  if (diffDays(today, nextStart) < 0) nextStart = addDays(nextStart, avgLen);
  const nextEnd   = addDays(nextStart, avgDur - 1);
  const ovul      = addDays(nextStart, avgLen - 14);
  const fertStart = addDays(ovul, -5);
  const daysLeft  = diffDays(today, nextStart);
  const fmt       = d => d.toLocaleDateString('id-ID', {day:'numeric', month:'short'});

  el.innerHTML = `
    <div class="ai-pred-card">
      <div class="apc-header">
        <div class="apc-title-row">
          <span class="apc-badge">📅 Prediksi</span>
          <button class="apc-refresh" onclick="window._refreshAIPred()">↻ AI</button>
        </div>
        <div class="apc-motivasi">Kamu luar biasa sudah tracking siklus ini 🌸</div>
      </div>
      <div class="apc-rows">
        <div class="apc-row apc-row-mens">
          <div class="apc-row-icon">🩸</div>
          <div class="apc-row-body">
            <div class="apc-row-label">Menstruasi berikutnya</div>
            <div class="apc-row-val">${fmt(nextStart)} – ${fmt(nextEnd)}</div>
            <div class="apc-row-sub"><b style="color:var(--mens)">${daysLeft > 0 ? daysLeft + ' hari lagi' : 'Sekitar sekarang'}</b></div>
          </div>
        </div>
        <div class="apc-row apc-row-fert">
          <div class="apc-row-icon">🌸</div>
          <div class="apc-row-body">
            <div class="apc-row-label">Fertile window perkiraan</div>
            <div class="apc-row-val">${fmt(fertStart)} – ${fmt(addDays(ovul, 1))}</div>
          </div>
        </div>
        <div class="apc-note">Rata-rata siklus: ${avgLen} hari · ${avgDur} hari mens. Aktifkan Groq untuk prediksi AI yang lebih cerdas.</div>
      </div>
    </div>`;
}

async function _fetchAIPrediction(completed, active) {
  // Susun data untuk prompt (urut terbaru dulu)
  const recent = [...completed]
    .sort((a,b) => parseDateSafe(b.startDate) - parseDateSafe(a.startDate))
    .slice(0, 8);
  const historyLines = recent.map((p, i) => {
    const dur  = diffDays(parseDateSafe(p.startDate), parseDateSafe(p.endDate)) + 1;
    const days = (periodDays[p.id] || []).slice().sort((a,b) => a.date.localeCompare(b.date));
    const dayDetail = days.length
      ? ' (' + days.map(d => `hari ${diffDays(parseDateSafe(p.startDate), parseDateSafe(d.date)) + 1}: ${d.flow || '—'}${d.symptoms?.length ? ', ' + d.symptoms.join(', ') : ''}`).join('; ') + ')'
      : '';
    return `- Periode ${completed.length - i}: mulai ${p.startDate}, selesai ${p.endDate} (${dur} hari)${dayDetail}`;
  }).join('\n');

  const activeInfo = active
    ? `\nSaat ini sedang menstruasi hari ke-${getDayOfPeriod(active)} (mulai ${active.startDate}), belum selesai.`
    : '';

  const todayStr = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  const prompt = `Hari ini: ${todayStr}
Riwayat siklus menstruasi saya (terbaru dulu):\n${historyLines}${activeInfo}

Berdasarkan pola di atas, prediksi siklus saya berikutnya.
Balas HANYA dengan JSON berikut (tidak ada teks lain, tidak ada markdown):
{
  "prediksi": "contoh: 15-19 Juli 2025",
  "daysUntil": 18,
  "fertile": "contoh: 1-6 Juli 2025",
  "avgCycleLen": 28,
  "motivasi": "kalimat motivasi hangat dan personal dalam bahasa Indonesia, max 1 kalimat",
  "catatan": "catatan singkat tentang pola siklusnya, max 1 kalimat"
}`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'Kamu adalah asisten kesehatan wanita Indonesia yang hangat dan empatik. Balas HANYA JSON valid tanpa teks tambahan apapun.' },
          { role: 'user',   content: prompt }
        ]
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json  = await res.json();
    const reply = (json.reply || '').trim();
    const match = reply.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.prediksi) return parsed;
    }
  } catch (e) { console.warn('[AI Pred]', e.message); }
  return null;
}

/* ══════════════════════════════
   AI FOOD + DRINK + MOTIVASI  (Groq)
══════════════════════════════ */
export async function renderFoodRecommendation(forceRefresh = false) {
  const el = document.getElementById('food-rec-card');
  if (!el) return;

  const info   = getCurrentCycleInfo();
  const active = getActivePeriod();
  const phase  = active ? 'mens' : info?.phase;

  if (!phase) { el.innerHTML = ''; return; }

  const today = new Date().toDateString();
  if (!forceRefresh && foodCache?.phase === phase && foodCache?.date === today && foodCache?.items?.length) {
    _renderFoodData(el, foodCache, phase);
    return;
  }
  if (foodLoading) return;
  foodLoading = true;

  el.innerHTML = `
    <div class="food-rec-inner">
      <div class="ldwrap" style="padding:20px 0">
        <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
        <div class="ld-txt">AI menyiapkan rekomendasi makanan & minuman…</div>
      </div>
    </div>`;

  const todayLog = active ? getTodayLog(active.id) : null;
  const result   = await _fetchFoodFromGroq(phase, todayLog?.symptoms || [], todayLog?.flow || null);
  foodLoading = false;

  if (result) {
    await saveFoodCache(phase, result.items, result.drinks, result.motivasi);
    foodCache = { phase, items: result.items, drinks: result.drinks, motivasi: result.motivasi, date: today };
    _renderFoodData(el, foodCache, phase);
  } else {
    _renderFoodData(el, { items: _fallbackFood(phase), drinks: _fallbackDrink(phase), motivasi: _fallbackMotivasi(phase) }, phase);
  }
}

function _renderFoodData(el, cache, phase) {
  const phaseNames = { mens:'Menstruasi', foll:'Folikular', ovul:'Ovulasi', lute:'Luteal' };
  const phaseEmoji = { mens:'🩸', foll:'🌱', ovul:'⭐', lute:'🌙' };

  el.innerHTML = `
    <div class="food-rec-inner">
      <div class="card-ttl" style="margin-bottom:10px">
        ${phaseEmoji[phase]} Nutrisi untuk Fase ${phaseNames[phase] || ''}
        <button onclick="window._refreshFood()" class="food-refresh-btn">↻ Refresh</button>
      </div>
      ${cache.motivasi ? `<div class="food-motivasi">"${cache.motivasi}"</div>` : ''}

      <div class="food-section-lbl">🍽️ Makanan</div>
      <div class="food-list">
        ${(cache.items || []).map(item => `
          <div class="food-item">
            <div class="food-emoji">${item.emoji || '🍽️'}</div>
            <div class="food-info">
              <div class="food-name">${item.nama || ''}</div>
              <div class="food-reason">${item.alasan || ''}</div>
            </div>
          </div>`).join('')}
      </div>

      ${(cache.drinks || []).length ? `
        <div class="food-section-lbl" style="margin-top:12px">🥤 Minuman</div>
        <div class="food-list">
          ${cache.drinks.map(d => `
            <div class="food-item">
              <div class="food-emoji">${d.emoji || '🥤'}</div>
              <div class="food-info">
                <div class="food-name">${d.nama || ''}</div>
                <div class="food-reason">${d.alasan || ''}</div>
              </div>
            </div>`).join('')}
        </div>` : ''}

      <div class="food-note">💡 Rekomendasi AI berdasarkan fase siklus · bukan pengganti saran dokter</div>
    </div>`;
}

async function _fetchFoodFromGroq(phase, symptoms, flow) {
  const phaseNames = { mens:'Menstruasi', foll:'Folikular', ovul:'Ovulasi', lute:'Luteal' };
  const symsText   = symptoms?.length ? ` Gejala hari ini: ${symptoms.join(', ')}.` : '';
  const flowText   = flow ? ` Aliran: ${flow}.` : '';

  const prompt =
    `Saya wanita Indonesia, fase ${phaseNames[phase]}.${flowText}${symsText}
Berikan rekomendasi nutrisi yang praktis dan cocok untuk wanita Indonesia.
Balas HANYA JSON ini (tanpa teks/markdown lain):
{
  "motivasi": "1 kalimat motivasi hangat dan menarik",
  "items": [
    {"emoji":"🥩","nama":"nama makanan","alasan":"manfaat singkat, max 10 kata"}
  ],
  "drinks": [
    {"emoji":"🍵","nama":"nama minuman","alasan":"manfaat singkat, max 10 kata"}
  ]
}
items harus 5 makanan, drinks harus 3 minuman. Prioritaskan bahan yang mudah ditemukan di Indonesia.`;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role:'system', content:'Kamu adalah ahli gizi kesehatan wanita Indonesia. Balas HANYA JSON valid tanpa teks lain.' },
          { role:'user',   content: prompt }
        ]
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json  = await res.json();
    const reply = (json.reply || '').trim();
    const match = reply.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.items?.length) return parsed;
    }
  } catch (e) { console.warn('[Food Groq]', e.message); }
  return null;
}

function _fallbackFood(phase) {
  const map = {
    mens: [
      {emoji:'🥩',nama:'Daging merah',    alasan:'Tinggi zat besi, ganti sel darah merah'},
      {emoji:'🐟',nama:'Ikan salmon',     alasan:'Omega-3 kurangi peradangan & kram'},
      {emoji:'🍌',nama:'Pisang',          alasan:'Magnesium & kalium kurangi kram otot'},
      {emoji:'🫚',nama:'Tempe goreng',    alasan:'Zat besi nabati sumber lokal terbaik'},
      {emoji:'🍫',nama:'Dark chocolate',  alasan:'Magnesium bantu mood lebih stabil'},
    ],
    foll: [
      {emoji:'🥦',nama:'Brokoli',         alasan:'Folat & antioksidan untuk energi'},
      {emoji:'🥚',nama:'Telur',           alasan:'Protein lengkap untuk regenerasi sel'},
      {emoji:'🌾',nama:'Oatmeal',         alasan:'Karbohidrat kompleks, energi tahan lama'},
      {emoji:'🥑',nama:'Alpukat',         alasan:'Lemak sehat dukung produksi hormon'},
      {emoji:'🫐',nama:'Blueberry',       alasan:'Antioksidan tinggi untuk vitalitas'},
    ],
    ovul: [
      {emoji:'🥬',nama:'Bayam',           alasan:'Zat besi & magnesium di puncak energi'},
      {emoji:'🫘',nama:'Edamame',         alasan:'Fitoestrogen alami yang baik'},
      {emoji:'🍓',nama:'Strawberry',      alasan:'Vitamin C tinggi untuk imunitas'},
      {emoji:'🐟',nama:'Tuna',            alasan:'Omega-3 dukung hormon sehat'},
      {emoji:'🥜',nama:'Kacang almond',   alasan:'Vitamin E untuk kesehatan reproduksi'},
    ],
    lute: [
      {emoji:'🍠',nama:'Ubi jalar',       alasan:'Magnesium & B6 bantu PMS'},
      {emoji:'🌰',nama:'Kacang walnut',   alasan:'Omega-3 kurangi gejala PMS'},
      {emoji:'🍊',nama:'Jeruk',           alasan:'Vitamin C & kalsium stabilkan mood'},
      {emoji:'🌾',nama:'Nasi merah',      alasan:'Serat tinggi stabilkan gula darah'},
      {emoji:'🫘',nama:'Tahu rebus',      alasan:'Kalsium & protein bantu mood PMS'},
    ],
  };
  return map[phase] || map.mens;
}
function _fallbackDrink(phase) {
  const map = {
    mens: [
      {emoji:'🍵',nama:'Teh jahe hangat',  alasan:'Anti-inflamasi, kurangi kram & mual'},
      {emoji:'💧',nama:'Air putih hangat',  alasan:'Bantu relaksasi otot rahim'},
      {emoji:'🫖',nama:'Teh chamomile',     alasan:'Tenangkan mood, kurangi kecemasan'},
    ],
    foll: [
      {emoji:'🥤',nama:'Smoothie hijau',    alasan:'Vitamin & mineral untuk energi naik'},
      {emoji:'🍋',nama:'Air lemon hangat',  alasan:'Detox alami, boost imunitas'},
      {emoji:'💧',nama:'Air kelapa muda',   alasan:'Elektrolit alami untuk stamina'},
    ],
    ovul: [
      {emoji:'🍹',nama:'Jus tomat',         alasan:'Lycopene antioksidan tinggi'},
      {emoji:'🥛',nama:'Susu rendah lemak', alasan:'Kalsium untuk tulang & hormon'},
      {emoji:'💧',nama:'Air kelapa muda',   alasan:'Hidrasi optimal di puncak energi'},
    ],
    lute: [
      {emoji:'🍵',nama:'Teh chamomile',     alasan:'Kurangi kecemasan & PMS'},
      {emoji:'🫖',nama:'Teh peppermint',    alasan:'Kurangi kembung & mual PMS'},
      {emoji:'🥛',nama:'Susu hangat',       alasan:'Triptofan bantu tidur & mood'},
    ],
  };
  return map[phase] || map.mens;
}
function _fallbackMotivasi(phase) {
  const map = {
    mens: 'Tubuhmu bekerja keras hari ini — istirahat adalah bentuk kekuatan, bukan kelemahan 💗',
    foll: 'Energimu sedang naik — ini saatnya mulai hal-hal yang selama ini kamu tunda ✨',
    ovul: 'Kamu sedang di puncakmu! Percaya diri dan shine bright 🌟',
    lute: 'Tubuhmu butuh lebih banyak kasih sayang sekarang — dan kamu layak mendapatkannya 🫂',
  };
  return map[phase] || map.mens;
}

/* ══════════════════════════════
   DAILY LOG MODAL  (bisa pilih tanggal → pengisian mundur)
══════════════════════════════ */

/**
 * Buka modal log harian.
 *  - periodId : periode yang dibuka (default: periode aktif)
 *  - dateStr  : tanggal yang dibuka (default: hari ini untuk periode aktif,
 *               atau hari pertama yang belum terisi)
 */
export function openDailyLog(periodId, dateStr) {
  ensureStyles();
  const period = periodId ? periods.find(p => p.id === periodId) : getActivePeriod();
  if (!period) {
    window._moodlyAlert?.({ icon:'🩸', title:'Tidak ada periode aktif', msg:'Tap "Mulai Menstruasi" untuk memulai periode baru.' });
    return;
  }

  const dates = getPeriodDates(period);
  if (!dates.length) {
    window._moodlyToast?.('Tidak ada tanggal yang bisa diisi untuk periode ini.');
    return;
  }

  // Tentukan tanggal default
  let target = dateStr;
  if (!target || !dates.includes(target)) {
    const todayStr  = fmtDateInput(new Date());
    const isActive  = getActivePeriod()?.id === period.id;
    const firstMiss = dates.find(ds => !getLog(period.id, ds));
    if (isActive && dates.includes(todayStr))      target = todayStr;
    else if (firstMiss)                            target = firstMiss;
    else                                           target = dates[dates.length - 1];
  }

  editingPeriodId = period.id;
  _loadDayState(period.id, target);
  _renderDailyLogModal();
  openModal('daily-log-modal');
}

function _loadDayState(periodId, dateStr) {
  editingDayDate   = dateStr;
  dailyLogFlow     = null;
  dailyLogSymptoms = [];

  const log = getLog(periodId, dateStr);
  if (log) {
    const fIdx = FLOWS.findIndex(f => f.l === log.flow);
    dailyLogFlow     = fIdx >= 0 ? fIdx : null;
    dailyLogSymptoms = (log.symptoms || []).map(s => SYMPTOMS.findIndex(x => x.l === s)).filter(i => i >= 0);
  }
}

function _ensureDateStripEl() {
  let strip = document.getElementById('daily-date-strip');
  if (strip) return strip;
  const flowEl = document.getElementById('daily-flow-row');
  if (!flowEl || !flowEl.parentNode) return null;
  strip = document.createElement('div');
  strip.id = 'daily-date-strip';
  flowEl.parentNode.insertBefore(strip, flowEl);
  return strip;
}

function _renderDailyLogModal() {
  const flowEl = document.getElementById('daily-flow-row');
  const symEl  = document.getElementById('daily-sym-grid');
  if (!flowEl || !symEl) return;

  const period = periods.find(p => p.id === editingPeriodId);

  // Judul
  const title = document.getElementById('daily-modal-title');
  if (title && period && editingDayDate) {
    const n = getDayNumberOn(period, editingDayDate);
    const isToday = editingDayDate === fmtDateInput(new Date());
    title.textContent = `🩸 Log Hari ke-${n} · ${isToday ? 'Hari ini' : fmtDate(editingDayDate)}`;
  }

  // Strip tanggal (pilih hari mana pun dalam periode)
  const strip = _ensureDateStripEl();
  if (strip && period) {
    const dates = getPeriodDates(period);
    const todayStr = fmtDateInput(new Date());
    const missingCnt = dates.filter(ds => !getLog(period.id, ds)).length;
    strip.innerHTML = `
      <div class="dls-wrap">
        <div class="dls-row">
          ${dates.map(ds => {
            const log = getLog(period.id, ds);
            const sel = ds === editingDayDate;
            const dots = FLOWS.find(f => f.l === log?.flow)?.dots || 0;
            return `<div class="dls-chip${sel ? ' sel' : ''}${log ? ' filled' : ' missing'}"
                         onclick="window._selectDailyDate('${ds}')">
              <div class="dls-n">H${getDayNumberOn(period, ds)}</div>
              <div class="dls-d">${ds === todayStr ? 'Hari ini' : fmtDateShort(ds)}</div>
              <div class="dls-dot" style="${log ? `background:${FLOW_COLORS[dots]}` : ''}"></div>
            </div>`;
          }).join('')}
        </div>
        ${missingCnt ? `<div class="dls-hint">${missingCnt} hari belum diisi (titik kosong) — tap tanggal untuk isi mundur</div>` : ''}
      </div>`;
    // geser ke tanggal terpilih
    setTimeout(() => strip.querySelector('.dls-chip.sel')?.scrollIntoView({ inline:'center', block:'nearest' }), 50);
  }

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
  const period = periods.find(p => p.id === editingPeriodId);
  if (!period || !editingDayDate) return;

  const data = {
    date:     editingDayDate,
    flow:     dailyLogFlow !== null ? FLOWS[dailyLogFlow].l : null,
    symptoms: dailyLogSymptoms.map(i => SYMPTOMS[i].l),
  };

  if (!periodDays[period.id]) periodDays[period.id] = [];
  const days = periodDays[period.id];
  const idx  = days.findIndex(d => d.date === editingDayDate);
  if (idx >= 0) days[idx] = data; else days.push(data);

  await savePeriodDay(period.id, editingDayDate, data);

  // Jika masih ada hari yang belum diisi, tawarkan lanjut ke hari kosong berikutnya
  const nextMissing = getMissingDates(period).find(ds => ds !== editingDayDate);
  const wasToday    = editingDayDate === fmtDateInput(new Date());
  const savedDate   = editingDayDate;

  closeModal('daily-log-modal');
  renderDailyLogBanner();
  renderMensActionButton();
  renderPhaseCard(getCurrentCycleInfo());
  renderPeriodHistory();
  if (wasToday) renderFoodRecommendation(true);
  // data hari berubah → prediksi AI perlu dihitung ulang kalau periode sudah selesai
  if (period.endDate && savedDate) renderAIPrediction(true);

  window._moodlyToast?.(nextMissing
    ? `Log ${fmtDate(savedDate)} tersimpan ✓ · masih ada hari yang kosong`
    : 'Log harian tersimpan ✓');
}

/* ══════════════════════════════
   HOME BANNER
══════════════════════════════ */
export function renderHomeCycleBanner() {
  const el = document.getElementById('home-cycle-banner');
  if (!el) return;
  const active = getActivePeriod();
  const info   = getCurrentCycleInfo();

  if (active) {
    const dayNum   = getDayOfPeriod(active);
    const needsLog = !getTodayLog(active.id);
    const missing  = getMissingDates(active).filter(ds => ds !== fmtDateInput(new Date())).length;
    el.className = 'cycle-banner mens';
    el.innerHTML = `<div class="cb-ico">🩸</div>
      <div class="cb-body">
        <div class="cb-tag mens">Sedang Menstruasi · Hari ke-${dayNum}</div>
        <div class="cb-title">${needsLog ? 'Belum isi log hari ini' : 'Log harian sudah tercatat ✓'}</div>
        <div class="cb-sub">${needsLog ? 'Tap untuk isi kondisi hari ini →' : (missing ? `${missing} hari terlewat belum diisi →` : 'Lihat detail siklus →')}</div>
      </div><div class="cb-arr" style="color:#ff6b8a">🩸</div>`;
    return;
  }

  if (!info) {
    el.className = 'cycle-banner none';
    el.innerHTML = `<div class="cb-ico">🌸</div>
      <div class="cb-body">
        <div class="cb-tag none">Cycle Tracker</div>
        <div class="cb-title">Mulai tracking siklus menstruasimu</div>
        <div class="cb-sub">Tap untuk memulai →</div>
      </div><div class="cb-arr">›</div>`;
    return;
  }

  const phase  = PHASES.find(p => p.id === info.phase);
  const titles = { mens:'Hari menstruasi 💗', foll:'Energi naik! 🌱', ovul:'Puncak energi ⭐', lute:'Self-care dulu 🌙' };
  el.className = `cycle-banner ${info.phase}`;
  el.innerHTML = `<div class="cb-ico">${phase.emoji}</div>
    <div class="cb-body">
      <div class="cb-tag ${info.phase}">Fase ${phase.name} · H${info.dayOfCycle}</div>
      <div class="cb-title">${titles[info.phase]}</div>
      <div class="cb-sub">Lihat prediksi AI →</div>
    </div><div class="cb-arr" style="color:${phase.color}">›</div>`;
}

/* ══════════════════════════════
   INSIGHT MINI
══════════════════════════════ */
export function renderInsightCycleMini() {
  const el = document.getElementById('ins-cycle-mini-list');
  if (!el) return;
  const sorted = [...periods].sort((a,b) => parseDateSafe(b.startDate) - parseDateSafe(a.startDate));
  if (!sorted.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:6px 0">Belum ada riwayat siklus.</div>';
    return;
  }
  el.innerHTML = sorted.slice(0, 4).map(p => {
    const dur     = p.endDate ? diffDays(parseDateSafe(p.startDate), parseDateSafe(p.endDate)) + 1 : '?';
    const dayLogs = (periodDays[p.id] || []).slice().sort((a,b) => a.date.localeCompare(b.date));
    const flowMini = dayLogs.map(d => {
      const dots = FLOWS.find(f => f.l === d.flow)?.dots || 0;
      return '<span class="fd-mini ' + (['','fd-light','fd-med','fd-heavy','fd-vheavy'][dots]||'fd-med') + '" style="display:inline-block;margin:0 1px"></span>'.repeat(dots);
    }).join('<span style="display:inline-block;width:3px"></span>');
    return `<div class="icm-row">
      <div class="icm-phase-dot" style="background:#ff6b8a"></div>
      <div class="icm-label">🩸 ${fmtDate(p.startDate)}${p.endDate ? ' – ' + fmtDate(p.endDate) : ' (aktif)'}</div>
      <div class="icm-syms">${dur !== '?' ? dur + 'h' : '?'}${flowMini ? ' ' + flowMini : ''}</div>
    </div>`;
  }).join('');

  // Tambah prediksi dari cache
  if (aiPredCache?.data?.prediksi) {
    const d = aiPredCache.data;
    el.innerHTML += `<div class="icm-row" style="background:rgba(255,107,138,.04);border-radius:8px;margin-top:4px">
      <div class="icm-phase-dot" style="background:#ff6b8a;opacity:.4"></div>
      <div class="icm-label">🔮 Prediksi berikutnya</div>
      <div class="icm-syms" style="color:#ff6b8a;font-weight:700">${d.prediksi}${d.daysUntil > 0 ? ' · ' + d.daysUntil + 'h lagi' : ''}</div>
    </div>`;
  }
}

/* ══════════════════════════════
   WINDOW HANDLERS
══════════════════════════════ */
window._startPeriod     = startPeriod;
window._stopPeriod      = stopPeriod;
window._openDailyLog    = () => openDailyLog();
window._openDailyLogDate = (periodId, dateStr) => openDailyLog(periodId, dateStr);
window._closeDailyLog   = () => closeModal('daily-log-modal');
window._submitDailyLog  = submitDailyLog;
window._selectDailyFlow = (i) => { dailyLogFlow = i; _renderDailyLogModal(); };
window._selectDailyDate = (dateStr) => {
  if (!editingPeriodId) return;
  _loadDayState(editingPeriodId, dateStr);
  _renderDailyLogModal();
};
window._toggleDailySym  = (i) => {
  const idx = dailyLogSymptoms.indexOf(i);
  if (idx >= 0) dailyLogSymptoms.splice(idx, 1); else dailyLogSymptoms.push(i);
  _renderDailyLogModal();
};
window._editPeriodDay = (periodId) => openDailyLog(periodId);

// Pengisian mundur: periode lampau & tanggal selesai manual
window._promptStartPeriod = () => {
  startPickerOpen = !startPickerOpen;
  backfillOpen = false;
  renderMensActionButton();
};
window._quickStartPeriod = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  startPeriod(fmtDateInput(d));
};
window._submitCustomStart = () => {
  const val = document.getElementById('start-date-input')?.value;
  if (!val) { window._moodlyToast?.('Pilih tanggal mulai dulu'); return; }
  startPeriod(val);
};
window._stopPeriodYesterday = async () => {
  const active = getActivePeriod();
  if (!active) return;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yestStr = fmtDateInput(d);
  if (yestStr < active.startDate) {
    window._moodlyToast?.('Periode baru mulai hari ini, tidak bisa selesai kemarin.');
    return;
  }
  await setPeriodEnd(active.id, yestStr, false);
};
window._setEndDateInputYesterday = () => {
  const inp = document.getElementById('end-date-input');
  if (!inp) return;
  const d = new Date();
  d.setDate(d.getDate() - 1);
  inp.value = fmtDateInput(d);
};
window._quickPresetBackfill = (daysAgoStart, duration) => {
  const sInp = document.getElementById('bf-start');
  const eInp = document.getElementById('bf-end');
  if (!sInp || !eInp) return;
  const dStart = new Date();
  dStart.setDate(dStart.getDate() - daysAgoStart);
  const dEnd = new Date(dStart);
  dEnd.setDate(dEnd.getDate() + (duration - 1));
  sInp.value = fmtDateInput(dStart);
  eInp.value = fmtDateInput(dEnd);
};
window._toggleBackfill  = () => {
  backfillOpen = !backfillOpen;
  startPickerOpen = false;
  renderMensActionButton();
};
window._toggleEndPicker = () => { endPickerOpen = !endPickerOpen; renderMensActionButton(); };
window._submitBackfill  = submitBackfillPeriod;
window._submitEndDate   = async () => {
  const active = getActivePeriod();
  if (!active) return;
  const val = document.getElementById('end-date-input')?.value;
  await setPeriodEnd(active.id, val);
};
window._setEndFromInput = async (periodId) => {
  const val = document.getElementById(`end-${periodId}`)?.value;
  await setPeriodEnd(periodId, val);
};

window._deletePeriod  = async (id) => {
  window._moodlyConfirm({
    icon:'🗑', title:'Hapus periode ini?',
    msg:'Data menstruasi dan log harian-nya akan terhapus.',
    confirmTxt:'Hapus', danger:true,
    onConfirm: async () => {
      await deletePeriod(id);
      delete periodDays[id];
      periods = periods.filter(p => p.id !== id);
      refreshAll();
    }
  });
};
window._refreshAIPred = async () => {
  aiPredCache = null;
  localStorage.removeItem('moodly_ai_pred');
  await renderAIPrediction(true);
};
window._refreshFood = async () => {
  foodCache = null;
  localStorage.removeItem('moodly_food_cache');
  await renderFoodRecommendation(true);
};

/* ══════════════════════════════
   STYLES (disuntik sekali — tidak perlu ubah CSS/HTML)
══════════════════════════════ */
function ensureStyles() {
  if (document.getElementById('cycle-backfill-styles')) return;
  const st = document.createElement('style');
  st.id = 'cycle-backfill-styles';
  st.textContent = `
    /* Action group tombol mulai & catat mundur */
    .mens-action-group { display: flex; gap: 8px; margin-bottom: 4px; }
    .mens-start-btn { flex: 1.2; padding: 14px; border-radius: 16px; border: none; background: #ff2d55; color: #fff; font-family: inherit; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 16px rgba(255, 45, 85, 0.25); transition: transform .12s; }
    .mens-start-btn:active { transform: scale(0.97); }
    .mens-backfill-btn { flex: 1; padding: 14px 10px; border-radius: 16px; border: 1.5px solid rgba(255, 45, 85, 0.2); background: #fff0f4; color: #ff2d55; font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px; transition: transform .12s; }
    .mens-backfill-btn:active { transform: scale(0.97); }

    .bf-quick-btns { display: flex; flex-wrap: wrap; gap: 6px; }
    .bf-qbtn { padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255, 45, 85, 0.25); background: #ffffff; color: #ff2d55; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .12s; }
    .bf-qbtn:hover, .bf-qbtn:active { background: #ff2d55; color: #ffffff; }

    .bf-actions-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .bf-sub-btn { flex: 1; padding: 9px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); background: #ffffff; color: #48484a; font-size: 11.5px; font-weight: 600; cursor: pointer; text-align: center; }
    .bf-sub-btn.missing-btn { border-color: rgba(255, 45, 85, 0.3); background: #fff0f4; color: #ff2d55; font-weight: 700; }

    .bf-overdue-box { background: #fff7ed; border: 1px solid rgba(249, 115, 22, 0.25); border-radius: 14px; padding: 12px; margin-bottom: 10px; }
    .bf-overdue-title { font-size: 12.5px; font-weight: 800; color: #c2410c; }
    .bf-overdue-desc { font-size: 11px; color: #9a3412; margin: 3px 0 8px; }

    /* strip tanggal di modal log */
    .dls-wrap{margin:0 0 14px}
    .dls-row{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px;scrollbar-width:none}
    .dls-row::-webkit-scrollbar{display:none}
    .dls-chip{flex:0 0 auto;min-width:54px;padding:8px 6px;border-radius:12px;text-align:center;
      border:1.5px solid rgba(0,0,0,.08);background:var(--card,#fff);cursor:pointer;transition:all .15s}
    .dls-chip.missing{border-style:dashed}
    .dls-chip.sel{border-color:#ff6b8a;background:rgba(255,107,138,.12);transform:translateY(-1px)}
    .dls-n{font-size:12px;font-weight:700;color:var(--text,#222)}
    .dls-d{font-size:10px;color:var(--muted,#888);margin-top:1px}
    .dls-dot{width:8px;height:8px;border-radius:50%;margin:5px auto 0;border:1.5px solid rgba(0,0,0,.15);background:transparent}
    .dls-chip.filled .dls-dot{border-color:transparent}
    .dls-hint{font-size:11px;color:var(--muted,#888);margin-top:2px}
    /* chip per hari di riwayat */
    .ph-daily-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
    .bf-chip{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:38px;padding:5px 6px;
      border-radius:10px;border:1px solid rgba(0,0,0,.08);cursor:pointer}
    .bf-chip.missing{border-style:dashed;opacity:.85}
    .bf-chip:active{transform:scale(.95)}
    .bf-chip-dot{width:9px;height:9px;border-radius:50%;border:1.5px solid rgba(0,0,0,.18);background:transparent}
    .bf-chip.filled .bf-chip-dot{border-color:transparent}
    /* link & form pengisian mundur */
    .bf-link{font-size:12px;color:var(--muted,#888);text-align:center;margin-top:10px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
    .bf-form{display:flex;flex-direction:column;gap:6px;margin-top:10px;padding:12px;border-radius:14px;
      background:rgba(255,107,138,.06);border:1px solid rgba(255,107,138,.2)}
    .bf-lbl{font-size:11px;font-weight:600;color:var(--muted,#888)}
    .bf-input{padding:9px 10px;border-radius:10px;border:1px solid rgba(0,0,0,.12);font-size:14px;background:var(--card,#fff);color:var(--text,#222)}
    .bf-save{margin-top:4px;padding:10px;border:none;border-radius:12px;background:#ff6b8a;color:#fff;font-weight:700;font-size:13px;cursor:pointer}
  `;
  document.head.appendChild(st);
}

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function diffDays(a, b) { return Math.round((b - a) / 86400000); }
function addDays(d, n)  { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmtDate(s) {
  const d = parseDateSafe(s);
  return d ? d.toLocaleDateString('id-ID', { day:'numeric', month:'short' }) : '?';
}
function fmtDateShort(s) {
  const d = parseDateSafe(s);
  return d ? d.toLocaleDateString('id-ID', { day:'numeric', month:'numeric' }) : '?';
}
function fmtDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDateSafe(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function openModal(id)  { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

/* Dummy exports untuk kompatibilitas app.js */
export function showCycleSetup() {}
export function saveCycleSetupFromForm() {}
export function showLogPeriod() {}
export function submitLogPeriod() {}
export function getCycleSettings() { return {}; }