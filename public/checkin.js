/* ═══════════════════════════════════════
   MOODLY — checkin.js
   Mood check-in: 3-step flow (Adaptive & Positive)
   ═══════════════════════════════════════ */

import { addEntry } from './firebase.js';

/* ════════════════
   DATA
════════════════ */
export const MOODS = [
  {e:'😄', img:'img/3d/mood-happy.png',     l:'Happy',    s:5, c:'#ff2d55'},
  {e:'😊', img:'img/3d/mood-oke.png',       l:'Oke',      s:4, c:'#ff5e8a'},
  {e:'😐', img:'img/3d/mood-biasa.png',     l:'Biasa',    s:3, c:'#f59e0b'},
  {e:'😔', img:'img/3d/mood-sedih.png',     l:'Sedih',    s:2, c:'#6366f1'},
  {e:'😰', img:'img/3d/mood-anxious.png',   l:'Anxious',  s:2, c:'#ec4899'},
  {e:'😤', img:'img/3d/mood-frustrasi.png', l:'Frustrasi',s:1, c:'#ef4444'},
  {e:'😴', img:'img/3d/mood-exhausted.png', l:'Exhausted',s:1, c:'#8b5cf6'},
  {e:'🫠', img:'img/3d/mood-burnout.png',   l:'Burnout',  s:1, c:'#0284c7'},
];

export const CAUSES = [
  {svg:'<path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" stroke="#ff2d55" stroke-width="1.8" stroke-linecap="round"/>',n:'Kerjaan'},
  {svg:'<path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" stroke="#ff2d55" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 12v5c3 3 9 3 12 0v-5" stroke="#ff2d55" stroke-width="1.8" stroke-linecap="round"/>',n:'Kuliah'},
  {svg:'<circle cx="12" cy="12" r="10" stroke="#ff2d55" stroke-width="1.8"/><path d="M12 6v6l4 2" stroke="#ff2d55" stroke-width="1.8" stroke-linecap="round"/>',n:'Finansial'},
  {svg:'<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#ff2d55" stroke-width="1.8" stroke-linejoin="round"/>',n:'Relationship'},
  {svg:'<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="#ff2d55" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 22V12h6v10" stroke="#ff2d55" stroke-width="1.8" stroke-linecap="round"/>',n:'Keluarga'},
  {svg:'<path d="M17 7l-1.41-1.41L12 9.17l-3.59-3.58L7 7l5 5 5-5zM12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9-4.03 9-9 9z" stroke="#ff2d55" stroke-width="1.5"/>',n:'Kurang tidur'},
  {svg:'<path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="#ff2d55" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',n:'Kesehatan'},
  {svg:'<circle cx="12" cy="12" r="10" stroke="#ff2d55" stroke-width="1.8"/><path d="M12 16v-4M12 8h.01" stroke="#ff2d55" stroke-width="2" stroke-linecap="round"/>',n:'Ga tau'},
];

export const INTENSITY_PRESETS = {
  positive: {
    title: 'Energi Perasaanmu',
    hint: 'Seberapa kuat energi positif yang kamu rasakan sekarang?',
    options: [
      {
        l: 'Tenang & Bersyukur',
        sub: 'Adem, damai di hati, dan bersahaja',
        color: '#10b981',
        svg: '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>'
      },
      {
        l: 'Cukup Bersemangat',
        sub: 'Aktif, produktif, dan ceria hari ini',
        color: '#ff9500',
        svg: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#ff9500" stroke-width="2" stroke-linejoin="round"/>'
      },
      {
        l: 'Puncak Bahagia',
        sub: 'Penuh sukacita, antusias & berenergi',
        color: '#ff2d55',
        svg: '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="#ff2d55" stroke-width="2" stroke-linejoin="round"/>'
      }
    ]
  },
  neutral: {
    title: 'Ritme Harimu',
    hint: 'Bagaimana alur dan ritme harimu berjalan?',
    options: [
      {
        l: 'Santai & Mengalir',
        sub: 'Rileks, tanpa banyak beban pikiran',
        color: '#0ea5e9',
        svg: '<path d="M5 12h14M12 5l7 7-7 7" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      },
      {
        l: 'Cukup Seimbang',
        sub: 'Semua berjalan normal dan stabil',
        color: '#f59e0b',
        svg: '<circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2"/><path d="M8 12h8" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>'
      },
      {
        l: 'Penuh Perenungan',
        sub: 'Banyak berpikir tenang dan introspeksi',
        color: '#8b5cf6',
        svg: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      }
    ]
  },
  difficult: {
    title: 'Beban Perasaan',
    hint: 'Seberapa dalam perasaan ini memengaruhimu?',
    options: [
      {
        l: 'Masih Terkendali',
        sub: 'Bisa diatasi perlahan, butuh sedikit jeda',
        color: '#3b82f6',
        svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#3b82f6" stroke-width="2" stroke-linejoin="round"/>'
      },
      {
        l: 'Cukup Menguras',
        sub: 'Mulai lelah dan butuh waktu rehat',
        color: '#f59e0b',
        svg: '<circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2"/><path d="M12 8v4M12 16h.01" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>'
      },
      {
        l: 'Sangat Menyesakkan',
        sub: 'Terasa berat, butuh teman curhat & istirahat',
        color: '#ef4444',
        svg: '<circle cx="12" cy="12" r="10" stroke="#ef4444" stroke-width="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>'
      }
    ]
  }
};

export const INTENSITIES = INTENSITY_PRESETS.difficult.options;

/* ════════════════
   STATE
════════════════ */
let cur = { mood: null, causes: [], intensity: null };
let onSubmitCallback = null;

const CI_TITLES = ['','Mood kamu sekarang?','Apa yang paling ngaruh?','Seberapa intens?'];

export function renderIntensityOptions() {
  const ir = document.getElementById('int-row');
  if (!ir) return;
  ir.innerHTML = '';

  let group = 'difficult';
  if (cur.mood) {
    if (['Happy', 'Oke'].includes(cur.mood.l)) group = 'positive';
    else if (cur.mood.l === 'Biasa') group = 'neutral';
  }
  const config = INTENSITY_PRESETS[group];

  const hintEl = document.querySelector('#st3 .step-hint');
  if (hintEl) hintEl.textContent = config.hint;

  config.options.forEach(opt => {
    const el = document.createElement('div');
    el.className = 'int-btn' + (cur.intensity === opt.l ? ' sel' : '');
    el.innerHTML = `
      <div class="int-btn-icon" style="background:${opt.color}15">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">${opt.svg}</svg>
      </div>
      <div class="int-btn-info">
        <div class="int-btn-title">${opt.l}</div>
        <div class="int-btn-sub">${opt.sub}</div>
      </div>
      <div class="int-btn-check">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    `;
    el.onclick = () => {
      document.querySelectorAll('.int-btn').forEach(x => x.classList.remove('sel'));
      el.classList.add('sel');
      cur.intensity = opt.l;
      const b3 = document.getElementById('btn3');
      if (b3) b3.disabled = false;
    };
    ir.appendChild(el);
  });
}

/* ════════════════
   BUILD UI (once)
════════════════ */
export function buildCheckinUI() {
  /* mood grid */
  const mg = document.getElementById('mood-grid');
  mg.innerHTML = '';
  MOODS.forEach(m => {
    const el = document.createElement('div'); el.className = 'mood-btn';
    el.innerHTML = `
      <div class="mood-3d-box">
        <img src="${m.img}" alt="${m.l}" class="mood-3d-icon" loading="lazy" onerror="this.outerHTML='<span class=\\'em\\'>${m.e}</span>'">
      </div>
      <span class="lb">${m.l}</span>
    `;
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
  renderIntensityOptions();
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

  if (n === 3) {
    renderIntensityOptions();
    let group = 'difficult';
    if (cur.mood) {
      if (['Happy', 'Oke'].includes(cur.mood.l)) group = 'positive';
      else if (cur.mood.l === 'Biasa') group = 'neutral';
    }
    document.getElementById('ci-title').textContent = INTENSITY_PRESETS[group].title;
  } else {
    document.getElementById('ci-title').textContent = CI_TITLES[n];
  }
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
    'Terima kasih sudah jujur dengan perasaanmu hari ini.',
    'Satu langkah refleksi yang sangat berharga untuk dirimu.',
    'Perasaanmu valid. Luangkan waktu untuk bernapas sejenak.',
    'Kamu sudah melakukan yang terbaik hari ini.',
    'Setiap check-in adalah bentuk kepedulian pada dirimu sendiri.',
  ];
  const sucEm = document.getElementById('suc-em');
  if (sucEm) {
    if (cur.mood?.img) {
      sucEm.innerHTML = `<img src="${cur.mood.img}" alt="${cur.mood.l}" class="suc-3d-img">`;
    } else {
      sucEm.textContent = cur.mood?.e || '✨';
    }
  }
  const sucSub = document.getElementById('suc-s');
  if (sucSub) {
    sucSub.textContent = msgs[Math.floor(Math.random() * msgs.length)];
  }

  const s = document.getElementById('success');
  s.classList.add('show');
  setTimeout(() => {
    s.classList.remove('show');
    if (onSubmitCallback) onSubmitCallback(entry);
  }, 2100);
  setTimeout(() => {
    const shareBtn = document.getElementById('post-checkin-share');
    if (shareBtn) {
      shareBtn.style.display = 'flex';
    }
  }, 2200); // muncul setelah success toast hilang


  // Tunjukkan tombol chat ke Jes setelah check-in
  const chatBtn = document.getElementById('post-checkin-chat');
  if (chatBtn) {
    chatBtn.dataset.mood      = JSON.stringify(cur.mood);
    chatBtn.dataset.intensity = cur.intensity || '';
    chatBtn.dataset.causes    = JSON.stringify(cur.causes);
    chatBtn.style.display     = 'flex';
  }
}
