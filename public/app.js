/* ═══════════════════════════════════════
   MOODLY — app.js
   Main orchestrator: routing, home, profile
   ═══════════════════════════════════════ */

import {
  loadProfile, saveProfile, loadEntries,
  deleteAllEntries, clearAllData, checkConnection,
  loadAppPasscode, saveSpecialDateRsvp, loadSpecialDateRsvp, DEFAULT_PASSCODE
} from './firebase.js';

import { initCycle, renderCycleScreen, renderHomeCycleBanner,
         showCycleSetup, saveCycleSetupFromForm,
         showLogPeriod, submitLogPeriod, getCurrentCycleInfo,
         getPeriods } from './cycle.js';

import { updateInsight, exportPDF } from './insight.js';
import { initNews, forceRefresh, filterNews, openArt, closeArt, buildHomePreview } from './news.js';
import { buildCheckinUI, startCheckin, goStep, submitCheckin, MOODS } from './checkin.js';
import { initChat, sendMessage, buildQuickReplies } from './chat.js';
import { initNearby, findNearby, filterNearby, refreshNearby, searchNearby } from './nearby.js';
import { openStories, closeStories } from './stories.js';
import { initSafePlace } from './safeplace.js';
import { initReminders, renderReminderWidget } from './reminder.js';

/* ════════════════
   GLOBAL STATE
════════════════ */
let entries = [];
let uname   = '';
let configuredPasscode = DEFAULT_PASSCODE || '261004';
let isPasscodeEnabled = true;
let enteredPin = '';
let isSessionUnlocked = false;

window.addEventListener('storage', (e) => {
  if (e.key === 'moodly_app_passcode' && e.newValue) {
    configuredPasscode = e.newValue;
  }
  if (e.key === 'moodly_passcode_enabled') {
    isPasscodeEnabled = e.newValue !== 'false';
  }
});

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
  initReminders();

  // Build static UI
  buildCheckinUI();
  buildNavHandlers();
  initViewportHandler();

  // Pre-load news articles in background so articles are instantly available
  initNews();

  // Load passcode settings from Firestore / local
  const passConfig = await loadAppPasscode();
  configuredPasscode = String(passConfig.passcode || '261004').trim();
  isPasscodeEnabled = passConfig.enabled !== false;

  // Prepare home screen
  updateHome();

  // Splashscreen lifecycle: smooth Apple iOS Pink fadeout after ~1.3s
  const splash = document.getElementById('splash');
  let splashDone = false;
  function dismissSplash() {
    if (splashDone) return;
    splashDone = true;
    if (splash) {
      splash.classList.add('hide');
      setTimeout(() => {
        splash.classList.remove('active');
        showScreen('home');
        if (isPasscodeEnabled && !isSessionUnlocked) {
          showPasscodeOverlay();
        } else {
          unlockApp(false);
        }
      }, 420);
    } else {
      showScreen('home');
      if (isPasscodeEnabled && !isSessionUnlocked) {
        showPasscodeOverlay();
      } else {
        unlockApp(false);
      }
    }
  }

  window._skipSplash = dismissSplash;
  setTimeout(dismissSplash, 1300);

  // If new user, show name modal after splash
  if (!uname) {
    setTimeout(() => openModal('name-modal'), 2200);
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
  document.querySelectorAll('.screen:not(#splash)').forEach(s => s.classList.remove('active'));

  // nav highlight — iOS Clean Pink & Neutral Gray
  document.querySelectorAll('.ni').forEach(b => {
    b.classList.remove('on','on-pink');
    b.querySelectorAll('svg, path, circle, rect').forEach(el => el.setAttribute('stroke','#8e8e93'));
    const lbl = b.querySelector('.ni-lbl');
    if (lbl) lbl.style.color = '#8e8e93';
  });

  document.getElementById(id).classList.add('active');

  const nb = document.getElementById(`ni-${id}`);
  if (nb) {
    nb.classList.add('on');
    nb.querySelectorAll('svg, path, circle, rect').forEach(el => el.setAttribute('stroke','#ffffff'));
    const lbl = nb.querySelector('.ni-lbl');
    if (lbl) lbl.style.color = '#ffffff';
  }

  if (id === 'home')       updateHome();
  if (id === 'insight')    updateInsight(entries, getPeriods());
  if (id === 'news')       initNews();
  if (id === 'cycle')      renderCycleScreen(entries);
  if (id === 'safeplace')  initSafePlace();
  if (id === 'chat') {
    setTimeout(() => window._chatViewportUpdate?.(), 50);
  } else {
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
    const sAvgEl = document.getElementById('s-avg');
    if (sAvgEl) {
      if (m?.img) {
        sAvgEl.innerHTML = `<img src="${m.img}" alt="${m.l}" class="stat-3d-icon">`;
      } else {
        sAvgEl.textContent = m.e;
      }
    }
  } else {
    document.getElementById('s-avg').textContent = '—';
  }

  // last entry card
  const el = document.getElementById('last-wrap');
  if (entries.length) {
    const last = entries[entries.length - 1];
    const d = new Date(last.ts);
    const t = d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    const moodIconHtml = last.mood?.img
      ? `<img src="${last.mood.img}" alt="${last.mood.l}" class="lcard-3d-img">`
      : `<img src="img/3d/mood-biasa.png" alt="Mood" class="lcard-3d-img">`;
    el.innerHTML = `<div class="lcard">
      <div class="lcard-em">${moodIconHtml}</div>
      <div>
        <div class="lcard-tag">Terakhir Check-in</div>
        <div class="lcard-name">${last.mood?.l||'—'}${last.intensity?' · '+last.intensity:''}</div>
        <div class="lcard-meta">${t}</div>
        ${last.causes?.length ? `<div class="lcard-chips">${last.causes.map(c=>`<span class="lchip">${c}</span>`).join('')}</div>` : ''}
      </div>
    </div>`;
  } else {
    el.innerHTML = `<div style="text-align:center;padding:18px;color:var(--muted);font-size:13px">
      Belum ada check-in hari ini<br><small style="margin-top:4px;display:inline-block">Tap tombol Check-in di atas untuk mulai</small></div>`;
  }

  renderHomeCycleBanner();
  renderReminderWidget();
  buildHomePreview();
  initNearby();
}

/* ════════════════
   GREETING
════════════════ */
function greet() {
  const h   = new Date().getHours();
  const t   = h<5?'Malam':h<12?'Pagi':h<15?'Siang':h<18?'Sore':'Malam';
  const tag = document.getElementById('hero-tag');
  if (tag) tag.textContent = `${t} yang damai`;
  const tb = document.getElementById('tb-uname');
  if (tb)  tb.textContent  = uname || 'Avril';
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
  document.getElementById('pm-name').textContent = uname || 'Sahabat Moodly';
  document.getElementById('pm-in').value = uname || '';
  const emailIn = document.getElementById('pm-email-in');
  if (emailIn) {
    emailIn.value = localStorage.getItem('moodly_user_email') || localStorage.getItem('moodly_reminder_email') || '';
  }
  const bioIn = document.getElementById('pm-bio-in');
  if (bioIn) {
    bioIn.value = localStorage.getItem('moodly_user_bio') || '';
  }
  const focusIn = document.getElementById('pm-focus-in');
  if (focusIn) {
    focusIn.value = localStorage.getItem('moodly_user_focus') || 'Self-care & Pemulihan';
  }

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
  const v = document.getElementById('pm-in')?.value.trim();
  const email = document.getElementById('pm-email-in')?.value.trim() || '';
  const bio = document.getElementById('pm-bio-in')?.value.trim() || '';
  const focus = document.getElementById('pm-focus-in')?.value || 'Self-care & Pemulihan';

  if (!v) {
    window._moodlyToast?.('Mohon isi nama kamu');
    return;
  }

  uname = v;
  localStorage.setItem('moodly_user', v);
  localStorage.setItem('moodly_uname', v);

  if (email) {
    localStorage.setItem('moodly_user_email', email);
    localStorage.setItem('moodly_reminder_email', email);
  }
  if (bio) {
    localStorage.setItem('moodly_user_bio', bio);
  }
  if (focus) {
    localStorage.setItem('moodly_user_focus', focus);
  }

  await saveProfile({
    name: v,
    email: email,
    bio: bio,
    focus: focus,
    updatedAt: new Date().toISOString()
  });

  closeModal('prof-modal');
  greet();
  updateHome();
  window._moodlyToast?.('Profil berhasil disimpan ✓');
}

async function clearUserData() {
  window._moodlyConfirm({
    iconSvg: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
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
════════════════ */
function initViewportHandler() {
  const chatEl = document.getElementById('chat');
  if (!chatEl) return;

  function updateChatHeight() {
    if (!chatEl.classList.contains('active')) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const h = vv.height;
    const t = vv.offsetTop;
    chatEl.style.height = h + 'px';
    chatEl.style.top    = t + 'px';
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateChatHeight);
    window.visualViewport.addEventListener('scroll', updateChatHeight);
  }

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
   IOS PASSCODE LOGIC
════════════════ */
function showPasscodeOverlay() {
  const overlay = document.getElementById('ios-passcode-overlay');
  if (!overlay) return;
  overlay.classList.remove('unlocked');
  enteredPin = '';
  updatePinDots();
  const feedback = document.getElementById('pc-feedback');
  if (feedback) feedback.textContent = '';
}

function pressPin(digit) {
  if (isSessionUnlocked || enteredPin.length >= 6) return;
  enteredPin += String(digit);
  updatePinDots();

  if (enteredPin.length === 6) {
    setTimeout(verifyPin, 120);
  }
}

function backspacePin() {
  if (isSessionUnlocked || enteredPin.length === 0) return;
  enteredPin = enteredPin.slice(0, -1);
  updatePinDots();
  const feedback = document.getElementById('pc-feedback');
  if (feedback) feedback.textContent = '';
}

function updatePinDots() {
  const dots = document.querySelectorAll('#pc-dots .pc-dot');
  dots.forEach((dot, index) => {
    dot.classList.toggle('filled', index < enteredPin.length);
  });
}

async function verifyPin() {
  const passConfig = await loadAppPasscode();
  configuredPasscode = String(passConfig.passcode || configuredPasscode).trim();

  if (enteredPin === configuredPasscode) {
    unlockApp(true);
  } else {
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    const row = document.getElementById('pc-dots');
    if (row) {
      row.classList.add('shake');
      setTimeout(() => row.classList.remove('shake'), 450);
    }
    const feedback = document.getElementById('pc-feedback');
    if (feedback) feedback.textContent = 'Passcode salah. Silakan coba lagi.';
    setTimeout(() => {
      enteredPin = '';
      updatePinDots();
    }, 450);
  }
}

function unlockApp(triggerGimmick = true) {
  isSessionUnlocked = true;
  const overlay = document.getElementById('ios-passcode-overlay');
  if (overlay) overlay.classList.add('unlocked');

  if (triggerGimmick) {
    setTimeout(() => {
      openDateInvitation();
    }, 420);
  }
}

/* ════════════════
   SPECIAL BIRTHDAY DATE INVITATION GIMMICK
════════════════ */
let countdownTimer = null;

function openDateInvitation() {
  const modal = document.getElementById('birthday-date-modal');
  if (!modal) return;
  modal.classList.add('show');
  startCountdown();
}

function closeDateInvitation() {
  const modal = document.getElementById('birthday-date-modal');
  if (modal) modal.classList.remove('show');
  if (countdownTimer) clearInterval(countdownTimer);
}

async function acceptDateInvite() {
  await saveSpecialDateRsvp('accepted', 'Siap datang & bawa kebahagiaan');
  if (window._moodlyAlert) {
    window._moodlyAlert({
      iconSvg: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
      title: 'Konfirmasi Diterima',
      msg: 'Sampai jumpa di Giur Bistro, Sabtu 24 Oktober 2026 pukul 15.00 WIB. Jangan lupa kenakan pakaian cerah dengan nuansa biru muda ya.'
    });
  } else if (window._moodlyToast) {
    window._moodlyToast('Konfirmasi tersimpan. Sampai jumpa di Giur Bistro.');
  }
  closeDateInvitation();
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  // Target: Sabtu, 24 Oktober 2026 15:00:00 WIB
  const targetDate = new Date('2026-10-24T15:00:00+07:00').getTime();
  const now = Date.now();
  const diff = targetDate - now;

  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');

  if (!daysEl) return;

  if (diff <= 0) {
    daysEl.textContent = '00';
    hoursEl.textContent = '00';
    minsEl.textContent = '00';
    secsEl.textContent = '00';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);

  daysEl.textContent = String(days).padStart(2, '0');
  hoursEl.textContent = String(hours).padStart(2, '0');
  minsEl.textContent = String(mins).padStart(2, '0');
  secsEl.textContent = String(secs).padStart(2, '0');
}

/* ════════════════
   GLOBAL WINDOW BINDINGS
════════════════ */
window._pressPin = pressPin;
window._backspacePin = backspacePin;
window._openDateInvitation = openDateInvitation;
window._closeDateInvitation = closeDateInvitation;
window._acceptDateInvite = acceptDateInvite;

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

// Stories
window._openStoryFromCheckin = () => {
  const last = entries.length ? entries[entries.length - 1] : null;
  if (last) {
    openStories(last);
  } else {
    window._moodlyAlert({ icon: 'img/3d/3d-target.png', title: 'Belum ada check-in', msg: 'Check-in dulu ya biar bisa share story!' });
  }
};
window._openStoriesDirect = (entryJson) => {
  try { openStories(JSON.parse(entryJson)); } catch {}
};
window._closeStories = closeStories;

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
    dayOfCycle: cycleInfo?.dayOfCycle || null,
    userName: uname,
  });
  const qr = document.getElementById('chat-quick');
  if (qr) {
    const replies = buildQuickReplies(mood);
    qr.innerHTML = replies.map(r =>
      `<button class="chat-qr" onclick="window._sendQuick(this)">${r}</button>`
    ).join('');
  }
  showScreen('chat');
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