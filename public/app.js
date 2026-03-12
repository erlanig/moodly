/* ═══════════════════════════════════════
   MOODLY — app.js
   Main orchestrator: routing, home, profile
   ═══════════════════════════════════════ */

import {
  loadProfile, saveProfile, loadEntries,
  deleteAllEntries, clearAllData, checkConnection
} from '../firebase.js';

import { initCycle, renderCycleScreen, renderHomeCycleBanner,
         showCycleSetup, saveCycleSetupFromForm,
         showLogPeriod, submitLogPeriod, getCurrentCycleInfo,
         getPeriods } from '../cycle.js';

import { updateInsight, exportPDF } from '../insight.js';
import { initNews, forceRefresh, filterNews, openArt, closeArt, buildHomePreview } from './news.js';
import { buildCheckinUI, startCheckin, goStep, submitCheckin, MOODS } from '../checkin.js';
import { initChat, sendMessage, buildQuickReplies } from '../chat.js';
import { initNearby, findNearby, filterNearby, refreshNearby, searchNearby } from '../nearby.js';

/* ════════════════
   GLOBAL STATE
════════════════ */
let entries = [];
let uname   = '';

/* ════════════════
   BOOT
════════════════ */
async function boot() {

  // Check firebase connection
  const online = await checkConnection();
  updateSyncDot(online);

  // Load user profile
  const profile = await loadProfile();
  if (profile?.name) {
    uname = profile.name;
    localStorage.setItem('moodly_user', uname);
  } else {
    uname = localStorage.getItem('moodly_user') || '';
  }

  // Load mood entries
  entries = await loadEntries();
  // Also keep local fallback fresh
  try { localStorage.setItem('moodly2', JSON.stringify(entries)); } catch {}

  // Load cycle data
  await initCycle();

  // Build static UI
  buildCheckinUI();
  buildNavHandlers();
  initViewportHandler();

  // Show home
  showScreen('home');

  // If new user, show name modal
  if (!uname) {
    setTimeout(() => openModal('name-modal'), 650);
  }

  // Poll sync every 60s
  setInterval(async () => {
    const ok = await checkConnection();
    updateSyncDot(ok);
  }, 60000);
}

/* ════════════════
   SCREEN ROUTER
════════════════ */
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  // nav highlight
  document.querySelectorAll('.ni').forEach(b => {
    b.classList.remove('on','on-pink');
    b.querySelector('svg').setAttribute('stroke','#8aab97');
    b.querySelector('.ni-lbl').style.color = '';
  });

  document.getElementById(id).classList.add('active');

  const nb = document.getElementById(`ni-${id}`);
  if (nb) {
    const pink = id === 'cycle';
    nb.classList.add(pink ? 'on-pink' : 'on');
    nb.querySelector('svg').setAttribute('stroke','white');
    nb.querySelector('.ni-lbl').style.color = 'white';
  }

  if (id === 'home')    updateHome();
  if (id === 'insight') updateInsight(entries, getPeriods());
  if (id === 'news')    initNews();
  if (id === 'cycle')   renderCycleScreen(entries);
  if (id === 'chat') {
    // Trigger viewport update setelah screen aktif
    setTimeout(() => window._chatViewportUpdate?.(), 50);
  } else {
    // Reset tinggi chat saat keluar
    window._chatViewportReset?.();
  }

  // Sembunyikan nav bar saat di chat screen
  const nav = document.getElementById('nav');
  if (nav) nav.style.display = id === 'chat' ? 'none' : '';
}

// expose globally for inline HTML onclick
window._showScreen = showScreen;

/* ════════════════
   HOME SCREEN
════════════════ */
function updateHome() {
  greet();

  // stats
  document.getElementById('s-total').textContent = entries.length;
  document.getElementById('streak').textContent  = calcStreak();

  if (entries.length) {
    const avg = entries.reduce((s,e) => s + (e.mood?.s||3), 0) / entries.length;
    const m   = MOODS.find(x => x.s === Math.round(avg)) || MOODS[2];
    document.getElementById('s-avg').textContent = m.e;
  } else {
    document.getElementById('s-avg').textContent = '—';
  }

  // last entry card
  const el = document.getElementById('last-wrap');
  if (entries.length) {
    const last = entries[entries.length - 1];
    const d = new Date(last.ts);
    const t = d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    el.innerHTML = `<div class="lcard">
      <div class="lcard-em">${last.mood?.e||'😐'}</div>
      <div>
        <div class="lcard-tag">Terakhir Check-in</div>
        <div class="lcard-name">${last.mood?.l||'—'}${last.intensity?' · '+last.intensity:''}</div>
        <div class="lcard-meta">${t}</div>
        ${last.causes?.length ? `<div class="lcard-chips">${last.causes.map(c=>`<span class="lchip">${c}</span>`).join('')}</div>` : ''}
      </div>
    </div>`;
  } else {
    el.innerHTML = `<div style="text-align:center;padding:18px;color:var(--muted);font-size:13px">
      Belum ada check-in 👋<br><small>Tap tombol Check-in di atas</small></div>`;
  }

  renderHomeCycleBanner();
  buildHomePreview();
  initNearby();
}

/* ════════════════
   GREETING
════════════════ */
function greet() {
  const h   = new Date().getHours();
  const t   = h<5?'Tengah malam':h<12?'Pagi':h<15?'Siang':h<18?'Sore':'Malam';
  const ico = h<5?'🌙':h<12?'☀️':h<18?'🌤️':'🌙';
  const n   = uname || 'kamu';
  const tag = document.getElementById('hero-tag');
  if (tag) tag.textContent = `Selamat ${t}, ${n} ${ico}`;
  const tb = document.getElementById('tb-uname');
  if (tb)  tb.textContent  = uname || 'Profil';
}

/* ════════════════
   STREAK
════════════════ */
function calcStreak() {
  const t = new Date(); t.setHours(0,0,0,0);
  const s = new Set(entries.map(e => { const d=new Date(e.ts); d.setHours(0,0,0,0); return d.getTime(); }));
  let n = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(t); d.setDate(t.getDate()-i);
    if (s.has(d.getTime())) n++; else if (i>0) break;
  }
  return n;
}

/* ════════════════
   PROFILE MODAL
════════════════ */
function showProf() {
  document.getElementById('pm-name').textContent = uname || 'User';
  document.getElementById('pm-in').value = uname;
  document.getElementById('pm-ci').textContent = entries.length;
  document.getElementById('pm-st').textContent = calcStreak();
  if (entries.length) {
    const avg = entries.reduce((s,e) => s+(e.mood?.s||3),0) / entries.length;
    const m   = MOODS.find(x => x.s === Math.round(avg)) || MOODS[2];
    document.getElementById('pm-av').textContent = m.e;
  } else {
    document.getElementById('pm-av').textContent = '—';
  }
  openModal('prof-modal');
}

async function updateName() {
  const v = document.getElementById('pm-in').value.trim();
  if (!v) return;
  uname = v;
  await saveProfile({ name: v });
  localStorage.setItem('moodly_user', v);
  closeModal('prof-modal');
  greet();
  updateHome();
}

async function clearUserData() {
  window._moodlyConfirm({
    icon: '❓',
    title: 'Hapus Semua Data?',
    msg: 'Semua check-in, siklus, dan data akan terhapus permanen.',
    confirmTxt: 'Ya, Hapus Semua',
    danger: true,
    onConfirm: async () => {
      await clearAllData();
      entries = [];
      closeModal('prof-modal');
      updateHome();
      updateInsight(entries, []);
      renderCycleScreen(entries);
    }
  });
}

/* ════════════════
   SAVE NAME (first time)
════════════════ */
async function saveName() {
  const v = document.getElementById('name-in').value.trim();
  if (!v) { document.getElementById('name-in').style.borderColor='#e53935'; return; }
  uname = v;
  await saveProfile({ name: v });
  localStorage.setItem('moodly_user', v);
  closeModal('name-modal');
  greet();
  updateHome();
}

/* ════════════════
   SPLASH → APP
════════════════ */
async function enterApp() {
  const s = document.getElementById('splash');
  s.classList.add('hide');
  setTimeout(() => { s.style.display='none'; }, 520);
  await boot();
}

/* ════════════════
   SYNC DOT
════════════════ */
function updateSyncDot(ok) {
  const dots = document.querySelectorAll('.sync-dot');
  dots.forEach(d => {
    d.classList.toggle('sync-err', !ok);
    d.title = ok ? 'Tersinkron ke Firebase' : 'Offline — data tersimpan lokal';
  });
}

/* ════════════════
   NAV HANDLERS
════════════════ */
function buildNavHandlers() {
  // Back gesture for article overlay
  window.addEventListener('popstate', () => {
    const ov = document.getElementById('art-ov');
    if (ov.classList.contains('open')) closeArt();
  });
}

/* ════════════════
   VISUAL VIEWPORT (keyboard handler)
   Buat chat screen resize mengikuti keyboard
════════════════ */
function initViewportHandler() {
  const chatEl = document.getElementById('chat');
  if (!chatEl) return;

  function updateChatHeight() {
    if (!chatEl.classList.contains('active')) return;
    const vv = window.visualViewport;
    if (!vv) return;
    // Tinggi = visualViewport height, posisi top mengikuti offset
    const h = vv.height;
    const t = vv.offsetTop;
    chatEl.style.height = h + 'px';
    chatEl.style.top    = t + 'px';
    // Scroll messages ke bawah saat keyboard muncul
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateChatHeight);
    window.visualViewport.addEventListener('scroll', updateChatHeight);
  }

  // Reset saat keluar chat
  window._chatViewportReset = () => {
    chatEl.style.height = '';
    chatEl.style.top    = '';
  };
  window._chatViewportUpdate = updateChatHeight;
}

/* ════════════════
   MODAL HELPERS
════════════════ */
function openModal(id)  { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }
window._openModal  = openModal;
window._closeModal = closeModal;

/* ════════════════
   GLOBAL WINDOW BINDINGS
   (called from inline HTML onclicks)
════════════════ */
window._enterApp    = enterApp;
window._saveName    = saveName;
window._showProf    = showProf;
window._updateName  = updateName;
window._clearData   = clearUserData;
window._closeProf   = () => closeModal('prof-modal');

// Check-in
window._startCheckin  = () => { startCheckin(onCheckinDone); showScreen('checkin'); };
window._goStep        = goStep;
window._submitCheckin = () => submitCheckin(entries);

// Cycle
window._showCycleSetup     = showCycleSetup;
window._saveCycleSetup     = saveCycleSetupFromForm;
window._closeCycleSettings = () => closeModal('cycle-settings-modal');
window._showLogPeriod      = () => showLogPeriod(null);
window._submitLogPeriod    = async () => { await submitLogPeriod(); renderCycleScreen(entries); };
window._closeLogPeriod     = () => closeModal('log-period-modal');

// News
window._forceRefresh = forceRefresh;
window._filterNews   = filterNews;
window._openArt      = openArt;
window._closeArt     = closeArt;

// Insight
window._exportPDF = () => exportPDF(entries, getPeriods(), getCurrentCycleInfo());

// Nearby
window._findNearby    = findNearby;
window._filterNearby  = filterNearby;
window._refreshNearby = refreshNearby;
window._searchNearby  = searchNearby;

// Chat
window._openChat = (moodJson, intensity, causesJson) => openChat(moodJson, intensity, causesJson);
window._openChatDirect = () => {
  // Buka chat dari home tanpa data check-in — pakai entry terakhir kalau ada
  const last = entries.length ? entries[entries.length - 1] : null;
  openChat(
    last?.mood ? JSON.stringify(last.mood) : 'null',
    last?.intensity || '',
    last?.causes ? JSON.stringify(last.causes) : '[]'
  );
};
window._sendChat = () => {
  const inp = document.getElementById('chat-input');
  if (!inp) return;
  const txt = inp.value.trim();
  if (!txt) return;
  inp.value = '';
  sendMessage(txt);
};
window._sendQuick = (btn) => {
  const txt = btn.textContent;
  btn.closest('#chat-quick').innerHTML = '';
  sendMessage(txt);
};
window._chatKeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window._sendChat(); } };

/* ════════════════
   AFTER CHECK-IN
════════════════ */
function onCheckinDone(entry) {
  showScreen('home');
}

/* ════════════════
   OPEN CHAT
════════════════ */
function openChat(moodJson, intensity, causesJson) {
  let mood = null, causes = [];
  try { mood = JSON.parse(moodJson); } catch {}
  try { causes = JSON.parse(causesJson); } catch {}
  const cycleInfo = getCurrentCycleInfo();
  initChat({
    mood,
    intensity,
    causes,
    cyclePhase: cycleInfo?.phase || null,
    userName: uname,
  });
  // Build quick replies
  const qr = document.getElementById('chat-quick');
  if (qr) {
    const replies = buildQuickReplies(mood);
    qr.innerHTML = replies.map(r =>
      `<button class="chat-qr" onclick="window._sendQuick(this)">${r}</button>`
    ).join('');
  }
  showScreen('chat');
  // Sembunyikan tombol post-checkin
  const btn = document.getElementById('post-checkin-chat');
  if (btn) btn.style.display = 'none';
}

/* ════════════════
   DOMContentLoaded
════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash');
  splash.classList.add('active');
  const t = setTimeout(() => enterApp(), 1800);
  window._enterApp = () => { clearTimeout(t); enterApp(); };
});