import { saveReminderToCloud, deleteReminderFromCloud } from './firebase.js';
/* ═══════════════════════════════════════
   MOODLY — reminder.js
   Smart Reminder & Task Automation with Google Gmail API
   ═══════════════════════════════════════ */

const STORAGE_KEY = 'moodly_reminders_v2';
const USER_EMAIL_KEY = 'moodly_user_email';

let reminders = [];
let currentFilter = 'all'; // 'all', 'today', 'completed'

/* ──────────── USER EMAIL HELPERS ──────────── */
export function getUserEmail() {
  return (localStorage.getItem(USER_EMAIL_KEY) || '').trim();
}

export function setUserEmail(email) {
  if (email && email.includes('@')) {
    localStorage.setItem(USER_EMAIL_KEY, email.trim().toLowerCase());
  }
}

/* ──────────── INITIALIZATION ──────────── */
export function initReminders() {
  loadFromStorage();
  renderReminderWidget();
  setupAutomationChecker();
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    reminders = raw ? JSON.parse(raw) : getInitialReminders();
  } catch (e) {
    reminders = getInitialReminders();
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  renderReminderWidget();
}

function getInitialReminders() {
  const todayStr = new Date().toISOString().split('T')[0];
  const userEmail = getUserEmail();
  return [
    {
      id: 'rem_1',
      title: 'Minum Air & Istirahat Sejenak',
      category: 'Self-care',
      date: todayStr,
      time: '14:30',
      note: 'Rehat mata 5 menit dan tarik napas dalam.',
      userEmail: userEmail,
      sendEmail: true,
      done: false,
      emailSent: false,
      createdAt: Date.now(),
    },
    {
      id: 'rem_2',
      title: 'Refleksi Harian & Journaling',
      category: 'Refleksi',
      date: todayStr,
      time: '20:00',
      note: 'Tuliskan 3 hal yang disyukuri hari ini.',
      userEmail: userEmail,
      sendEmail: true,
      done: false,
      emailSent: false,
      createdAt: Date.now(),
    }
  ];
}

/* ──────────── RENDER WIDGET ON HOME SCREEN ──────────── */
export function renderReminderWidget() {
  const wrap = document.getElementById('reminder-widget-wrap');
  if (!wrap) return;

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = reminders.filter(r => {
    if (currentFilter === 'today') return r.date === todayStr && !r.done;
    if (currentFilter === 'completed') return r.done;
    return true; // 'all'
  });

  const activeCount = reminders.filter(r => !r.done).length;
  const savedEmail = getUserEmail();

  wrap.innerHTML = `
    <div class="reminder-card">
      <div class="rc-header">
        <div class="rc-title-box">
          <div class="rc-icon-badge">
            <img src="img/3d/3d-clock.png" alt="Reminder" class="rc-3d-ico">
          </div>
          <div>
            <div class="rc-title">Pengingat & Agenda</div>
            <div class="rc-subtitle">${activeCount} aktif ${savedEmail ? '· ' + savedEmail : '· Notifikasi Email Siap'}</div>
          </div>
        </div>
        <button class="rc-add-btn" onclick="window._openReminderModal()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Tambah
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="rc-filter-bar">
        <button class="rc-tab ${currentFilter === 'all' ? 'active' : ''}" onclick="window._setReminderFilter('all')">Semua (${reminders.length})</button>
        <button class="rc-tab ${currentFilter === 'today' ? 'active' : ''}" onclick="window._setReminderFilter('today')">Hari Ini</button>
        <button class="rc-tab ${currentFilter === 'completed' ? 'active' : ''}" onclick="window._setReminderFilter('completed')">Selesai</button>
      </div>

      <!-- Reminders List -->
      <div class="rc-list">
        ${filtered.length ? filtered.map(r => renderReminderItem(r)).join('') : renderEmptyState()}
      </div>

      <!-- Action Footer: Email Sync -->
      <div class="rc-footer">
        <button class="rc-sync-btn" onclick="window._sendDailyAgendaEmail()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          Kirim Ringkasan Agenda ke Email Saya
        </button>
      </div>
    </div>
  `;
}

function renderReminderItem(r) {
  const categoryColors = {
    'Self-care': '#ff2d55',
    'Kesehatan': '#34c759',
    'Tugas': '#007aff',
    'Refleksi': '#af52de',
    'Ibadah': '#ff9500',
  };
  const catColor = categoryColors[r.category] || '#ff2d55';

  return `
    <div class="rem-item ${r.done ? 'rem-done' : ''}" id="rem-item-${r.id}">
      <div class="rem-checkbox ${r.done ? 'checked' : ''}" onclick="window._toggleReminderDone('${r.id}')">
        ${r.done ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>` : ''}
      </div>

      <div class="rem-content" onclick="window._openReminderModal('${r.id}')">
        <div class="rem-top">
          <span class="rem-category-pill" style="color:${catColor};background:${catColor}15">${r.category || 'Umum'}</span>
          <span class="rem-time">${r.date ? r.date : ''} ${r.time ? '· ' + r.time : ''}</span>
        </div>
        <div class="rem-title">${r.title}</div>
        ${r.note ? `<div class="rem-note">${r.note}</div>` : ''}
      </div>

      <div class="rem-actions">
        <button class="rem-act-btn email-btn" title="Kirim Notifikasi Email Sekarang" onclick="window._sendEmailNow('${r.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${r.emailSent ? '#34c759' : '#8e8e93'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </button>
        <button class="rem-act-btn del-btn" title="Hapus" onclick="window._deleteReminder('${r.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c7c7cc" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="rem-empty">
      <div class="rem-empty-icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d1d6" stroke-width="1.8" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="rem-empty-title">Tidak ada agenda saat ini</div>
      <div class="rem-empty-sub">Tap "Tambah" untuk mencatat rutinitas, obat, atau tugasmu.</div>
    </div>
  `;
}

/* ──────────── USER ACTIONS ──────────── */
export function setReminderFilter(filter) {
  currentFilter = filter;
  renderReminderWidget();
}

export function toggleReminderDone(id) {
  const item = reminders.find(r => r.id === id);
  if (!item) return;
  item.done = !item.done;
  saveToStorage();
  if (item.done) {
    window._moodlyToast?.('Tugas diselesaikan! Kerja bagus ✓');
  }
}

export function deleteReminder(id) {
  window._moodlyConfirm({
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
    title: 'Hapus Pengingat?',
    msg: 'Pengingat ini akan dihapus dari daftar agendamu.',
    confirmTxt: 'Hapus',
    cancelTxt: 'Batal',
    danger: true,
    onConfirm: () => {
      reminders = reminders.filter(r => r.id !== id);
      saveToStorage();
      window._moodlyToast?.('Pengingat dihapus.');
    }
  });
}

/* ──────────── MODAL ADD/EDIT ──────────── */
export function openReminderModal(id = null) {
  const existing = id ? reminders.find(r => r.id === id) : null;
  const modal = document.getElementById('reminder-modal');
  if (!modal) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  document.getElementById('rem-modal-id').value = existing ? existing.id : '';
  document.getElementById('rem-modal-title').value = existing ? existing.title : '';
  document.getElementById('rem-modal-cat').value = existing ? (existing.category || 'Self-care') : 'Self-care';
  document.getElementById('rem-modal-date').value = existing ? existing.date : todayStr;
  document.getElementById('rem-modal-time').value = existing ? existing.time : timeStr;
  document.getElementById('rem-modal-note').value = existing ? (existing.note || '') : '';

  const sendEmailCheckbox = document.getElementById('rem-modal-email');
  if (sendEmailCheckbox) {
    sendEmailCheckbox.checked = existing ? existing.sendEmail !== false : true;
  }

  // Pre-fill user email input
  const emailInput = document.getElementById('rem-modal-user-email');
  if (emailInput) {
    emailInput.value = existing?.userEmail || getUserEmail();
  }

  toggleReminderEmailInput();
  modal.classList.add('show');
  modal.classList.add('open');
}

export function closeReminderModal() {
  const modal = document.getElementById('reminder-modal');
  if (modal) { modal.classList.remove('show'); modal.classList.remove('open'); }
}

export function toggleReminderEmailInput() {
  const isChecked = document.getElementById('rem-modal-email')?.checked;
  const wrap = document.getElementById('rem-email-field-wrap');
  if (wrap) {
    wrap.style.display = isChecked ? 'block' : 'none';
  }
}

export function applyReminderPreset(title, cat) {
  const titleInput = document.getElementById('rem-modal-title');
  const catInput = document.getElementById('rem-modal-cat');
  if (titleInput) titleInput.value = title;
  if (catInput) catInput.value = cat;
}

export function saveReminderFromModal() {
  const id = document.getElementById('rem-modal-id')?.value;
  const title = document.getElementById('rem-modal-title')?.value?.trim();
  const category = document.getElementById('rem-modal-cat')?.value || 'Self-care';
  const date = document.getElementById('rem-modal-date')?.value || '';
  const time = document.getElementById('rem-modal-time')?.value || '';
  const note = document.getElementById('rem-modal-note')?.value?.trim() || '';
  const sendEmail = document.getElementById('rem-modal-email')?.checked ?? true;
  let userEmail = document.getElementById('rem-modal-user-email')?.value?.trim() || '';

  if (!title) {
    window._moodlyToast?.('Mohon isi judul pengingat');
    return;
  }

  let finalSendEmail = sendEmail;
  if (sendEmail) {
    if (userEmail && userEmail.includes('@')) {
      setUserEmail(userEmail);
    } else {
      const saved = getUserEmail();
      if (saved) {
        userEmail = saved;
      } else {
        // If email not provided yet, still save the reminder smoothly!
        finalSendEmail = false;
        window._moodlyToast?.('Pengingat tersimpan di aplikasi ✓ (Kirim email dilewati)');
      }
    }
  }

  if (id) {
    // Edit existing
    const item = reminders.find(r => r.id === id);
    if (item) {
      item.title = title;
      item.category = category;
      item.date = date;
      item.time = time;
      item.note = note;
      item.sendEmail = finalSendEmail;
      item.userEmail = userEmail || getUserEmail();
    }
  } else {
    // Add new
    const newItem = {
      id: 'rem_' + Date.now(),
      title,
      category,
      date,
      time,
      note,
      userEmail: userEmail || getUserEmail(),
      sendEmail: finalSendEmail,
      done: false,
      emailSent: false,
      createdAt: Date.now(),
    };
    reminders.unshift(newItem);
  }

  saveToStorage();
  const savedItem = id ? reminders.find(r => r.id === id) : newItem;
  if (savedItem) saveReminderToCloud(savedItem);
  closeReminderModal();
  window._moodlyToast?.('Pengingat berhasil disimpan ✓');

  if (sendEmail) {
    setTimeout(() => {
      window._moodlyToast?.(`Email reminder akan dikirim ke ${userEmail || getUserEmail()} ✓`);
    }, 1500);
  }
}

/* ──────────── GMAIL AUTOMATION API DISPATCH ──────────── */
export async function sendEmailNow(id) {
  const item = reminders.find(r => r.id === id);
  if (!item) return;

  const targetEmail = item.userEmail || getUserEmail();
  if (!targetEmail || !targetEmail.includes('@')) {
    openReminderModal(id);
    window._moodlyToast?.('Masukkan email kamu terlebih dahulu agar notifikasi terkirim');
    return;
  }

  window._moodlyToast?.(`Mengirim pengingat ke ${targetEmail}...`);

  try {
    const res = await fetch('/api/reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_email',
        to: targetEmail,
        title: item.title,
        note: item.note,
        datetime: `${item.date || ''} ${item.time || ''}`.trim(),
        category: item.category || 'Self-care',
        userName: localStorage.getItem('moodly_uname') || 'Sahabat Moodly',
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      item.emailSent = true;
      saveToStorage();
      window._moodlyAlert?.({
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
        title: 'Pengingat Terkirim!',
        msg: `Notifikasi "${item.title}" berhasil dikirim otomatis dari sistem Moodly ke email kamu (${targetEmail}).`,
        okTxt: 'Bagus Sekali',
      });
    } else {
      throw new Error(data.error?.message || data.error || 'Gagal mengirim email');
    }
  } catch (err) {
    console.error('[Email Send Error]', err);
    window._moodlyToast?.('Gagal mengirim email: ' + err.message);
  }
}

export async function sendDailyAgendaEmail() {
  if (!reminders.length) {
    window._moodlyToast?.('Belum ada agenda untuk dikirim.');
    return;
  }

  const targetEmail = getUserEmail();
  if (!targetEmail || !targetEmail.includes('@')) {
    openReminderModal();
    window._moodlyToast?.('Masukkan email kamu di form pengingat terlebih dahulu ya.');
    return;
  }

  window._moodlyToast?.(`Mengirim ringkasan agenda ke ${targetEmail}...`);

  try {
    const res = await fetch('/api/reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'send_summary',
        to: targetEmail,
        reminders: reminders,
        userName: localStorage.getItem('moodly_uname') || 'Sahabat Moodly',
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      window._moodlyAlert?.({
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff2d55" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
        title: 'Ringkasan Terkirim!',
        msg: `Daftar seluruh agenda harianmu telah dikirimkan ke email kamu (${targetEmail}).`,
        okTxt: 'Sip!',
      });
    } else {
      throw new Error(data.error?.message || data.error || 'Gagal mengirim');
    }
  } catch (err) {
    console.error('[Summary Email Error]', err);
    window._moodlyToast?.('Gagal: ' + err.message);
  }
}

/* ──────────── REAL-TIME BACKGROUND CHECKER ──────────── */
function setupAutomationChecker() {
  setInterval(() => {
    checkDueReminders();
  }, 30000);
}

function checkDueReminders() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  reminders.forEach(r => {
    if (!r.done && !r.emailSent && r.sendEmail && r.date === todayStr && r.time) {
      if (r.time === currentTimeStr) {
        r.emailSent = true;
        saveToStorage();

        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Moodly Reminder: ${r.title}`, {
            body: r.note || 'Waktunya menjalankan agendamu sekarang.',
            icon: 'img/jes-memoji.svg',
          });
        }

        const targetEmail = r.userEmail || getUserEmail();
        if (targetEmail && targetEmail.includes('@')) {
          sendEmailNow(r.id);
        }
      }
    }
  });
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// Global window exposure for inline onclick handlers
if (typeof window !== 'undefined') {
  window._openReminderModal = openReminderModal;
  window._closeReminderModal = closeReminderModal;
  window._toggleReminderEmailInput = toggleReminderEmailInput;
  window._saveReminderFromModal = saveReminderFromModal;
  window._setReminderFilter = setReminderFilter;
  window._toggleReminderDone = toggleReminderDone;
  window._deleteReminder = deleteReminder;
  window._sendEmailNow = sendEmailNow;
  window._sendDailyAgendaEmail = sendDailyAgendaEmail;
  window._applyReminderPreset = applyReminderPreset;
}
