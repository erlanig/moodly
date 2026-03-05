/* ═══════════════════════════════════════
   MOODLY — checkin.js
   Mood check-in: 3-step flow
   ═══════════════════════════════════════ */

import { addEntry } from './firebase.js';

/* ════════════════
   DATA
════════════════ */
export const MOODS = [
  {e:'😄',l:'Happy',   s:5, c:'#22c55e'},
  {e:'😊',l:'Oke',     s:4, c:'#4ade80'},
  {e:'😐',l:'Biasa',   s:3, c:'#fbbf24'},
  {e:'😔',l:'Sedih',   s:2, c:'#fb923c'},
  {e:'😰',l:'Anxious', s:2, c:'#f472b6'},
  {e:'😤',l:'Frustrasi',s:1,c:'#f87171'},
  {e:'😴',l:'Exhausted',s:1,c:'#a78bfa'},
  {e:'🫠',l:'Burnout', s:1, c:'#60a5fa'},
];

export const CAUSES = [
  {svg:'<path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="#1db954" stroke-width="1.8" stroke-linecap="round"/>',n:'Kerjaan'},
  {svg:'<path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" stroke="#1db954" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 12v5c3 3 9 3 12 0v-5" stroke="#1db954" stroke-width="1.8" stroke-linecap="round"/>',n:'Kuliah'},
  {svg:'<circle cx="12" cy="12" r="10" stroke="#1db954" stroke-width="1.8"/><path d="M12 6v6l4 2" stroke="#1db954" stroke-width="1.8" stroke-linecap="round"/>',n:'Finansial'},
  {svg:'<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#1db954" stroke-width="1.8" stroke-linejoin="round"/>',n:'Relationship'},
  {svg:'<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#1db954" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 22V12h6v10" stroke="#1db954" stroke-width="1.8" stroke-linecap="round"/>',n:'Keluarga'},
  {svg:'<path d="M17 7l-1.41-1.41L12 9.17l-3.59-3.58L7 7l5 5 5-5zM12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9z" stroke="#1db954" stroke-width="1.5"/>',n:'Kurang tidur'},
  {svg:'<path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#1db954" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',n:'Kesehatan'},
  {svg:'<circle cx="12" cy="12" r="10" stroke="#1db954" stroke-width="1.8"/><path d="M12 16v-4M12 8h.01" stroke="#1db954" stroke-width="2" stroke-linecap="round"/>',n:'Ga tau'},
];

export const INTENSITIES = [
  {l:'Ringan', svg:'<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="#1db954" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="4" stroke="#1db954" stroke-width="2"/>'},
  {l:'Lumayan',svg:'<circle cx="12" cy="12" r="10" stroke="#f57c00" stroke-width="2"/><path d="M8 15s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke="#f57c00" stroke-width="2" stroke-linecap="round"/>'},
  {l:'Berat',  svg:'<circle cx="12" cy="12" r="10" stroke="#e53935" stroke-width="2"/><path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01" stroke="#e53935" stroke-width="2" stroke-linecap="round"/>'},
];

/* ════════════════
   STATE
════════════════ */
let cur = { mood: null, causes: [], intensity: null };
let onSubmitCallback = null;

const CI_TITLES = ['','Mood kamu sekarang?','Apa yang paling ngaruh?','Seberapa intens?'];

/* ════════════════
   BUILD UI (once)
════════════════ */
export function buildCheckinUI() {
  /* mood grid */
  const mg = document.getElementById('mood-grid');
  mg.innerHTML = '';
  MOODS.forEach(m => {
    const el = document.createElement('div'); el.className = 'mood-btn';
    el.innerHTML = `<span class="em">${m.e}</span><span class="lb">${m.l}</span>`;
    el.onclick = () => {
      document.querySelectorAll('.mood-btn').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel'); cur.mood = m;
      document.getElementById('btn1').disabled = false;
    };
    mg.appendChild(el);
  });

  /* cause grid */
  const cg = document.getElementById('cause-grid');
  cg.innerHTML = '';
  CAUSES.forEach(c => {
    const el = document.createElement('div'); el.className = 'cause-btn';
    el.innerHTML = `<div class="cause-ic"><svg width="14" height="14" viewBox="0 0 24 24" fill="none">${c.svg}</svg></div><span class="cause-nm">${c.n}</span>`;
    el.onclick = () => {
      el.classList.toggle('sel');
      if (el.classList.contains('sel')) cur.causes.push(c.n);
      else cur.causes = cur.causes.filter(x => x !== c.n);
    };
    cg.appendChild(el);
  });

  /* intensity */
  const ir = document.getElementById('int-row');
  ir.innerHTML = '';
  INTENSITIES.forEach(t => {
    const el = document.createElement('button'); el.className = 'int-btn';
    el.innerHTML = `<svg viewBox="0 0 24 24" fill="none">${t.svg}</svg>${t.l}`;
    el.onclick = () => {
      document.querySelectorAll('.int-btn').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel'); cur.intensity = t.l;
      document.getElementById('btn3').disabled = false;
    };
    ir.appendChild(el);
  });
}

/* ════════════════
   START / RESET
════════════════ */
export function startCheckin(callback) {
  onSubmitCallback = callback;
  cur = { mood: null, causes: [], intensity: null };
  document.querySelectorAll('.mood-btn,.cause-btn,.int-btn').forEach(x => x.classList.remove('sel'));
  document.getElementById('btn1').disabled = true;
  document.getElementById('btn3').disabled = true;
  goStep(1);
}

/* ════════════════
   STEP NAV
════════════════ */
export function goStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById(`st${i}`).classList.toggle('on', i === n);
    const seg = document.getElementById(`seg${i}`);
    seg.className = 'prog-seg';
    if (i < n) seg.classList.add('done');
    else if (i === n) seg.classList.add('on');
  });
  document.getElementById('ci-num').textContent  = `${n} / 3`;
  document.getElementById('ci-title').textContent = CI_TITLES[n];
}

/* ════════════════
   SUBMIT
════════════════ */
export async function submitCheckin(entries) {
  const entry = {
    ts: new Date().toISOString(),
    mood: cur.mood,
    causes: [...cur.causes],
    intensity: cur.intensity,
  };
  const id = await addEntry(entry);
  if (id) entry.id = id;
  entries.push(entry);

  const msgs = [
    'Proud of you buat check-in hari ini 🫂',
    'Udah jujur sama diri sendiri, keren! ✨',
    'Satu langkah kecil yang berarti besar 🌱',
    'You doing great, keep going! 💚',
    'Tiap check-in itu bentuk self-love 💚',
  ];
  document.getElementById('suc-em').textContent = cur.mood.e;
  document.getElementById('suc-s').textContent  = msgs[Math.floor(Math.random()*5)];

  const s = document.getElementById('success');
  s.classList.add('show');
  setTimeout(() => {
    s.classList.remove('show');
    if (onSubmitCallback) onSubmitCallback(entry);
  }, 2100);

  // Tunjukkan tombol chat ke AI setelah check-in
  const chatBtn = document.getElementById('post-checkin-chat');
  if (chatBtn) {
    chatBtn.dataset.mood      = JSON.stringify(cur.mood);
    chatBtn.dataset.intensity = cur.intensity || '';
    chatBtn.dataset.causes    = JSON.stringify(cur.causes);
    chatBtn.style.display     = 'flex';
  }
}