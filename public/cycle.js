/* ═══════════════════════════════════════
   MOODLY — cycle.js  v2
   • Tombol Mulai / Selesai Mens
   • Input per hari (flow + gejala)
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

/* ══════════════════════════════
   STATE
══════════════════════════════ */
let periods     = [];
let periodDays  = {};   // { [periodId]: [{date, flow, symptoms}] }

let dailyLogFlow     = null;
let dailyLogSymptoms = [];
let editingDayDate   = null;

let aiPredCache  = null;
let aiPredLoading= false;
let foodCache    = null;
let foodLoading  = false;

/* ══════════════════════════════
   INIT
══════════════════════════════ */
export async function initCycle() {
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
    return diffDays(parseDateSafe(p.startDate), new Date()) <= 20;
  }) || null;
}
function getDayOfPeriod(period) {
  const start = parseDateSafe(period.startDate);
  const today = new Date(); today.setHours(0,0,0,0);
  return diffDays(start, today) + 1;
}
function getTodayLog(periodId) {
  const today = fmtDateInput(new Date());
  return (periodDays[periodId] || []).find(d => d.date === today) || null;
}

/* ══════════════════════════════
   ACTIONS: MULAI / SELESAI
══════════════════════════════ */
export async function startPeriod() {
  if (getActivePeriod()) {
    window._moodlyToast?.('Periode aktif sudah ada! Tap Selesai dulu.');
    return;
  }
  const today = fmtDateInput(new Date());
  const id = await addPeriod({ startDate: today, endDate: null });
  periods.unshift({ id, startDate: today, endDate: null });
  periodDays[id] = [];

  renderMensActionButton();
  renderDailyLogBanner();
  renderPeriodHistory();

  // Langsung buka daily log hari pertama
  setTimeout(() => openDailyLog(), 250);
}

export async function stopPeriod() {
  const active = getActivePeriod();
  if (!active) { window._moodlyToast?.('Tidak ada periode aktif.'); return; }

  const dayNum = getDayOfPeriod(active);
  window._moodlyConfirm({
    icon: '✅',
    title: 'Menstruasi selesai?',
    msg: `Periode hari ke-${dayNum} (mulai ${fmtDate(active.startDate)}). Konfirmasi selesai hari ini?`,
    confirmTxt: 'Ya, Selesai 🌸',
    onConfirm: async () => {
      const today = fmtDateInput(new Date());
      await updatePeriod(active.id, { endDate: today });
      const idx = periods.findIndex(p => p.id === active.id);
      if (idx >= 0) periods[idx].endDate = today;

      renderMensActionButton();
      renderDailyLogBanner();
      renderPeriodHistory();
      renderAIPrediction(true);

      window._moodlyToast?.('Periode selesai dicatat ✓');
    }
  });
}

/* ══════════════════════════════
   RENDER — MAIN SCREEN
══════════════════════════════ */
export function renderCycleScreen(entries = []) {
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
  const active = getActivePeriod();

  if (active) {
    const dayNum   = getDayOfPeriod(active);
    const todayLog = getTodayLog(active.id);
    const needsLog = !todayLog;
    el.innerHTML = `
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
      </div>`;
  } else {
    el.innerHTML = `
      <button class="mens-start-btn" onclick="window._startPeriod()">
        🩸 Mulai Menstruasi
      </button>`;
  }
}

/* ──────────── Daily log banner ──────────── */
function renderDailyLogBanner() {
  const el = document.getElementById('daily-log-banner');
  if (!el) return;
  const active = getActivePeriod();
  if (!active) { el.innerHTML = ''; return; }

  const dayNum   = getDayOfPeriod(active);
  const todayLog = getTodayLog(active.id);

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
  el.innerHTML = sorted.slice(0, 8).map((p, i) => {
    const start = fmtDate(p.startDate);
    const end   = p.endDate ? fmtDate(p.endDate) : '— (aktif)';
    const dur   = p.endDate ? diffDays(parseDateSafe(p.startDate), parseDateSafe(p.endDate)) + 1 : getDayOfPeriod(p);

    const days    = (periodDays[p.id] || []).sort((a,b) => a.date.localeCompare(b.date));
    const dayHtml = days.length
      ? `<div class="ph-daily-row">
          ${days.map(d => {
            const dots = FLOWS.find(f => f.l === d.flow)?.dots || 0;
            const cls  = ['','fd-light','fd-med','fd-heavy','fd-vheavy'][dots] || 'fd-light';
            const tip  = `${fmtDateShort(d.date)}: ${d.flow || '—'}${d.symptoms?.length ? ' · ' + d.symptoms.join(', ') : ''}`;
            return `<div class="ph-day-col" title="${tip}">
              <div class="ph-day-lbl">${fmtDateShort(d.date)}</div>
              <div class="ph-day-dots">${'<div class="fd-mini '+cls+'"></div>'.repeat(dots || 1)}</div>
            </div>`;
          }).join('')}
        </div>` : '';

    return `<div class="ph-row">
      <div class="ph-num">${sorted.length - i}</div>
      <div class="ph-info">
        <div class="ph-dates">🩸 ${start} – ${end}</div>
        <div class="ph-dur">${dur} hari${p.endDate ? '' : ' (belum selesai)'}</div>
        ${dayHtml}
      </div>
      <div class="ph-acts">
        ${!p.endDate ? '' : `<div class="ph-act" onclick="window._editPeriodDay('${p.id}')" title="Log harian">📝</div>`}
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
  // Susun data untuk prompt
  const historyLines = completed.slice(0, 8).map((p, i) => {
    const dur  = diffDays(parseDateSafe(p.startDate), parseDateSafe(p.endDate)) + 1;
    const days = (periodDays[p.id] || []).sort((a,b) => a.date.localeCompare(b.date));
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
   DAILY LOG MODAL
══════════════════════════════ */
export function openDailyLog(periodId) {
  const active = periodId ? periods.find(p => p.id === periodId) : getActivePeriod();
  if (!active) {
    window._moodlyAlert?.({ icon:'🩸', title:'Tidak ada periode aktif', msg:'Tap "Mulai Menstruasi" untuk memulai periode baru.' });
    return;
  }

  dailyLogFlow     = null;
  dailyLogSymptoms = [];
  editingDayDate   = fmtDateInput(new Date());

  const todayLog = getTodayLog(active.id);
  if (todayLog) {
    const fIdx = FLOWS.findIndex(f => f.l === todayLog.flow);
    dailyLogFlow     = fIdx >= 0 ? fIdx : null;
    dailyLogSymptoms = (todayLog.symptoms || []).map(s => SYMPTOMS.findIndex(x => x.l === s)).filter(i => i >= 0);
  }

  const title  = document.getElementById('daily-modal-title');
  const dayNum = getDayOfPeriod(active);
  if (title) title.textContent = `🩸 Log Hari ke-${dayNum}`;

  _renderDailyLogModal();
  openModal('daily-log-modal');
}

function _renderDailyLogModal() {
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

  if (!periodDays[active.id]) periodDays[active.id] = [];
  const days = periodDays[active.id];
  const idx  = days.findIndex(d => d.date === editingDayDate);
  if (idx >= 0) days[idx] = data; else days.push(data);

  await savePeriodDay(active.id, editingDayDate, data);
  closeModal('daily-log-modal');
  renderDailyLogBanner();
  renderMensActionButton();
  renderPhaseCard(getCurrentCycleInfo());
  renderPeriodHistory();
  renderFoodRecommendation(true);
  window._moodlyToast?.('Log harian tersimpan ✓');
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
    el.className = 'cycle-banner mens';
    el.innerHTML = `<div class="cb-ico">🩸</div>
      <div class="cb-body">
        <div class="cb-tag mens">Sedang Menstruasi · Hari ke-${dayNum}</div>
        <div class="cb-title">${needsLog ? 'Belum isi log hari ini' : 'Log harian sudah tercatat ✓'}</div>
        <div class="cb-sub">${needsLog ? 'Tap untuk isi kondisi hari ini →' : 'Lihat detail siklus →'}</div>
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
    const dayLogs = (periodDays[p.id] || []).sort((a,b) => a.date.localeCompare(b.date));
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
window._closeDailyLog   = () => closeModal('daily-log-modal');
window._submitDailyLog  = submitDailyLog;
window._selectDailyFlow = (i) => { dailyLogFlow = i; _renderDailyLogModal(); };
window._toggleDailySym  = (i) => {
  const idx = dailyLogSymptoms.indexOf(i);
  if (idx >= 0) dailyLogSymptoms.splice(idx, 1); else dailyLogSymptoms.push(i);
  _renderDailyLogModal();
};
window._editPeriodDay = (periodId) => openDailyLog(periodId);
window._deletePeriod  = async (id) => {
  window._moodlyConfirm({
    icon:'🗑', title:'Hapus periode ini?',
    msg:'Data menstruasi dan log harian-nya akan terhapus.',
    confirmTxt:'Hapus', danger:true,
    onConfirm: async () => {
      await deletePeriod(id);
      delete periodDays[id];
      periods = periods.filter(p => p.id !== id);
      renderMensActionButton();
      renderDailyLogBanner();
      renderPeriodHistory();
      renderPhaseCard(getCurrentCycleInfo());
      renderAIPrediction(true);
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