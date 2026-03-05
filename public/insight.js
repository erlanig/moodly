/* ═══════════════════════════════════════
   MOODLY — insight.js
   Weekly insight screen: charts, calendar, analysis
   ═══════════════════════════════════════ */

import { renderInsightCycleMini } from './cycle.js';

/* ════════════════
   MAIN RENDER
════════════════ */
export function updateInsight(entries, periods) {
  renderWeeklyBars(entries);
  renderCalendar(entries, periods);
  renderWeeklyAnalysis(entries);
  renderCauseChips(entries);
  renderJournal(entries);
  renderInsightCycleMini();
}

/* ════════════════
   WEEKLY BAR CHART
════════════════ */
function renderWeeklyBars(entries) {
  const bw = document.getElementById('chart-bars');
  if (!bw) return;
  bw.innerHTML = '';
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i); d.setHours(0,0,0,0);
    const de = entries.filter(e => {
      const ed = new Date(e.ts); ed.setHours(0,0,0,0);
      return ed.getTime() === d.getTime();
    });
    const avg = de.length ? de.reduce((s,e) => s + (e.mood?.s||3), 0) / de.length : 0;
    const h   = avg ? (avg/5)*70 + 8 : 0;
    const last = de.length ? de[de.length-1].mood : null;
    const col  = last ? last.c : '#e0f0e8';

    const w = document.createElement('div'); w.className = 'bar-col';
    w.innerHTML = `
      ${last ? `<div class="bar-em">${last.e}</div>` : '<div class="bar-em" style="opacity:0">·</div>'}
      <div class="bar" style="height:${h}px;background:${col};opacity:${de.length?1:.3}"></div>
      <div class="bar-d">${days[d.getDay()]}</div>`;
    bw.appendChild(w);
  }
}

/* ════════════════
   CALENDAR
════════════════ */
function renderCalendar(entries, periods) {
  const cg = document.getElementById('cal-grid');
  if (!cg) return;

  const now = new Date();
  const yr = now.getFullYear(), mo = now.getMonth();
  const fd  = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo+1, 0).getDate();
  const tod = now.getDate();

  // build mood map
  const mbd = {};
  entries.forEach(e => {
    const d = new Date(e.ts);
    if (d.getFullYear() === yr && d.getMonth() === mo) mbd[d.getDate()] = e.mood;
  });

  // build period days set for this month
  const periodDays = new Set();
  (periods || []).forEach(p => {
    if (!p.startDate) return;
    const start = new Date(p.startDate); start.setHours(0,0,0,0);
    const end   = p.endDate ? new Date(p.endDate) : start;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
      if (d.getFullYear() === yr && d.getMonth() === mo) periodDays.add(d.getDate());
    }
  });

  let html = '';
  for (let i = 0; i < fd; i++) html += `<div class="cal-day"></div>`;
  for (let dt = 1; dt <= dim; dt++) {
    const mood  = mbd[dt];
    const isMens = periodDays.has(dt);
    let cls = 'cal-day';
    if (isMens) cls += ' mens-day';
    else if (mood) cls += ' filled';
    if (dt === tod) cls += ' today';
    html += `<div class="${cls}">
      <span>${dt}</span>
      ${isMens ? '<span class="cal-em">🩸</span>' : mood ? `<span class="cal-em">${mood.e}</span>` : ''}
    </div>`;
  }
  cg.innerHTML = html;
}

/* ════════════════
   WEEKLY ANALYSIS TEXT
════════════════ */
function renderWeeklyAnalysis(entries) {
  const el = document.getElementById('ins-txt');
  if (!el) return;
  const today = new Date();
  const week  = entries.filter(e => (today - new Date(e.ts)) < 7 * 86400000);

  if (week.length >= 3) {
    const avg = week.reduce((s,e) => s + (e.mood?.s||3), 0) / week.length;
    if (avg >= 4)      el.textContent = '🌟 Seminggu ini mood kamu positif banget! Pertahankan energi ini ya.';
    else if (avg >= 3) el.textContent = '⚖️ Mood kamu cukup stabil. Ada ups and downs, tapi kamu handle dengan baik.';
    else               el.textContent = '💙 Minggu ini terasa berat ya. Ingat — minta bantuan itu kuat, bukan lemah.';
  } else if (week.length) {
    el.textContent = `📈 Kamu udah ${week.length}× check-in! Terusin biar insight makin akurat.`;
  } else {
    el.textContent = 'Belum cukup data. Check-in dulu yuk!';
  }
}

/* ════════════════
   CAUSE CHIPS
════════════════ */
function renderCauseChips(entries) {
  const el = document.getElementById('cause-chips');
  if (!el) return;
  const today = new Date();
  const week  = entries.filter(e => (today - new Date(e.ts)) < 7 * 86400000);
  const cc    = {};
  week.forEach(e => e.causes?.forEach(c => { cc[c] = (cc[c]||0) + 1; }));
  const tot = Object.values(cc).reduce((a,b) => a+b, 0);

  el.innerHTML = tot
    ? Object.entries(cc)
        .sort((a,b) => b[1]-a[1])
        .map(([n,cnt]) => `<div class="chip">${n} <span class="chip-pct">${Math.round(cnt/tot*100)}%</span></div>`)
        .join('')
    : '<span style="font-size:12px;color:var(--muted)">Belum ada data</span>';
}

/* ════════════════
   JOURNAL
════════════════ */
function renderJournal(entries) {
  const el = document.getElementById('journal');
  if (!el) return;
  const rec = entries.slice(-5).reverse();
  el.innerHTML = rec.length
    ? rec.map(e => {
        const d = new Date(e.ts);
        const t = d.toLocaleDateString('id-ID', { weekday:'short', day:'numeric', month:'short' });
        return `<div class="jrow">
          <span style="font-size:21px">${e.mood?.e||'😐'}</span>
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text)">${e.mood?.l||'—'} · ${e.intensity||'—'}</div>
            <div style="font-size:11px;color:var(--muted)">${t}${e.causes?.length ? ' · ' + e.causes.slice(0,2).join(', ') : ''}</div>
          </div>
        </div>`;
      }).join('')
    : '<div style="font-size:13px;color:var(--muted);padding:7px 0">Belum ada riwayat check-in.</div>';
}

/* ════════════════
   PDF EXPORT
════════════════ */
export function exportPDF(entries, periods, cycleInfo) {
  if (!entries.length) {
    window._moodlyAlert({ icon:'📊', title:'Belum ada data', msg:'Coba check-in dulu ya biar ada data yang bisa diekspor!' });
    return;
  }
  const today = new Date();
  const week  = entries.filter(e => (today - new Date(e.ts)) < 7*86400000);
  const cc    = {};
  week.forEach(e => e.causes?.forEach(c => { cc[c] = (cc[c]||0)+1; }));
  const top = Object.entries(cc).sort((a,b) => b[1]-a[1])[0];

  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Moodly Report</title>
  <style>
    body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:20px}
    h1{color:#0d8c3e}
    .sec{background:#f4faf7;border-radius:12px;padding:18px;margin-bottom:14px}
    .sec h2{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#8aab97;margin-bottom:10px}
    .entry{border-bottom:1px solid #e0f0e8;padding:9px 0;display:flex;align-items:center;gap:10px}
    .entry:last-child{border-bottom:none}
    .badge{display:inline-block;background:#e8faf0;border-radius:8px;padding:7px 12px;margin:3px}
    .bv{font-size:18px;font-weight:900;color:#0d8c3e}
    .bl{font-size:10px;color:#999}
    .mens-badge{background:#fff0f3}
    .mens-bv{color:#ff6b8a}
    @media print{body{margin:0}}
  </style></head><body>
  <h1>🌱 Moodly Report</h1>
  <p style="color:#999;font-size:13px;margin-bottom:18px">
    ${today.toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
  </p>
  <div class="sec"><h2>Ringkasan 7 Hari</h2>
    <div class="badge"><div class="bv">${week.length}</div><div class="bl">Check-in</div></div>
    ${week.length ? `<div class="badge"><div class="bv">${(week.reduce((s,e)=>s+(e.mood?.s||3),0)/week.length).toFixed(1)}/5</div><div class="bl">Rata-rata Mood</div></div>` : ''}
    ${top ? `<div class="badge"><div class="bv">${top[0]}</div><div class="bl">Penyebab Utama</div></div>` : ''}
    ${cycleInfo ? `<div class="badge mens-badge"><div class="bv mens-bv">H${cycleInfo.dayOfCycle}</div><div class="bl">Hari Siklus</div></div>` : ''}
  </div>
  ${periods?.length ? `<div class="sec"><h2>Riwayat Siklus (${periods.length} periode)</h2>
    ${periods.slice(0,6).map(p => `<div class="entry">
      <span style="font-size:20px">🩸</span>
      <div>
        <div style="font-weight:700;font-size:13px">${p.startDate}${p.endDate?' – '+p.endDate:''}</div>
        <div style="font-size:11px;color:#999">${p.flow||''}${p.symptoms?.length?' · '+p.symptoms.join(', '):''}</div>
      </div></div>`).join('')}
  </div>` : ''}
  <div class="sec"><h2>Riwayat Mood (${entries.length} total)</h2>
    ${entries.slice(-20).reverse().map(e => `<div class="entry">
      <span style="font-size:20px">${e.mood?.e||'😐'}</span>
      <div>
        <div style="font-weight:700;font-size:13px">${e.mood?.l||'—'} · ${e.intensity||''}</div>
        <div style="font-size:11px;color:#999">${new Date(e.ts).toLocaleDateString('id-ID',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
        ${e.causes?.length?`<div style="font-size:10px;color:#666">${e.causes.join(' · ')}</div>`:''}
      </div></div>`).join('')}
  </div>
  <script>window.print();<\/script></body></html>`);
  win.document.close();
}