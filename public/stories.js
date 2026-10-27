/* ═══════════════════════════════════════
   MOODLY — stories.js
   Mood Stories: Instagram-Style Card Generator
   • Multi-Photo & Single Photo Support
   • 4 Aesthetic Story Templates (Polaroid, Grid, Editorial, Minimalist)
   • 100% 3D Icons (Bukan Memoji/Emoji Biasa)
   • Ultra High Resolution 9:16 Story Export
   ═══════════════════════════════════════ */

/* ════════════════
   STORY TEMPLATES
════════════════ */
const TEMPLATES = [
  { id: 'polaroid', name: 'Polaroid', icon: '📸', desc: 'Frame Foto Vintage' },
  { id: 'grid',     name: 'Kolase Grid', icon: '🖼️', desc: 'Kolase Multi-Foto' },
  { id: 'editorial',name: 'Editorial', icon: '✨', desc: 'Hero Photo Majalah' },
  { id: 'minimal',  name: 'Minimalis', icon: '🌸', desc: '3D Art Card' },
];

/* ════════════════
   STORY THEMES
════════════════ */
const THEMES = [
  {
    id: 'sakura',
    name: 'Sakura Pink',
    bg: 'linear-gradient(160deg, #2b0416 0%, #611032 50%, #b81d58 100%)',
    cardBg: 'rgba(255, 255, 255, 0.12)',
    accent: '#ff5e8a',
    accentLight: '#ffa8c0',
    text: '#fff5f8',
    particle: '<span class="story-dot" style="background:#ff5e8a"></span>',
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    bg: 'linear-gradient(160deg, #1f0b24 0%, #521945 50%, #c0392b 100%)',
    cardBg: 'rgba(255, 255, 255, 0.12)',
    accent: '#f97316',
    accentLight: '#fdba74',
    text: '#fff5f0',
    particle: '<span class="story-dot" style="background:#f97316"></span>',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    bg: 'linear-gradient(160deg, #091129 0%, #15325b 50%, #1e5f8a 100%)',
    cardBg: 'rgba(255, 255, 255, 0.12)',
    accent: '#38bdf8',
    accentLight: '#bae6fd',
    text: '#f0f9ff',
    particle: '<span class="story-dot" style="background:#38bdf8"></span>',
  },
  {
    id: 'forest',
    name: 'Emerald Forest',
    bg: 'linear-gradient(160deg, #062413 0%, #114c28 50%, #17723e 100%)',
    cardBg: 'rgba(255, 255, 255, 0.12)',
    accent: '#4ade80',
    accentLight: '#bbf7d0',
    text: '#e8faf0',
    particle: '<span class="story-dot" style="background:#4ade80"></span>',
  },
  {
    id: 'night',
    name: 'Midnight Slate',
    bg: 'linear-gradient(160deg, #020617 0%, #0f172a 60%, #1e293b 100%)',
    cardBg: 'rgba(255, 255, 255, 0.12)',
    accent: '#818cf8',
    accentLight: '#c7d2fe',
    text: '#f1f5f9',
    particle: '<span class="story-dot" style="background:#818cf8"></span>',
  },
  {
    id: 'latte',
    name: 'Warm Latte',
    bg: 'linear-gradient(160deg, #2b1810 0%, #543324 50%, #875c43 100%)',
    cardBg: 'rgba(255, 255, 255, 0.14)',
    accent: '#d97706',
    accentLight: '#fde68a',
    text: '#fefce8',
    particle: '<span class="story-dot" style="background:#f59e0b"></span>',
  }
];

/* ════════════════
   STATE
════════════════ */
let currentThemeIdx   = 0;
let currentTemplateId = 'polaroid';
let selectedPhotoIdx  = 0;
let currentEntry      = null;

/* ════════════════
   OPEN STORIES MODAL
════════════════ */
export function openStories(entry) {
  currentEntry = entry;
  currentThemeIdx = 0;
  selectedPhotoIdx = 0;

  // Auto-detect template yang paling pas
  const hasPhotos = entry?.photos && entry.photos.length > 0;
  if (hasPhotos) {
    currentTemplateId = entry.photos.length > 1 ? 'grid' : 'polaroid';
  } else {
    currentTemplateId = 'minimal';
  }

  const modal = document.getElementById('stories-modal');
  if (!modal) return;

  renderTemplateSelector();
  renderPhotoPicker();
  renderThemeSelector();
  renderStoryPreview();
  modal.classList.add('show');
}

/* ════════════════
   RENDER PREVIEWS
════════════════ */
function getMood3DIconHtml(mood, size = 68) {
  if (mood && mood.img) {
    return `<img src="${mood.img}" class="story-3d-main-img" style="width:${size}px;height:${size}px;object-fit:contain" alt="${mood.l}">`;
  }
  // Fallback 3D icon
  return `<img src="img/3d/3d-heart.png" class="story-3d-main-img" style="width:${size}px;height:${size}px;object-fit:contain" alt="Moodly">`;
}

function getQuoteForMood(score) {
  const quotes = {
    5: ['Energi positifmu hari ini begitu nyata & memancar.', 'Hari yang indah milikmu seutuhnya.', 'Kebahagiaanmu selalu valid & berharga.'],
    4: ['Merasa cukup oke itu sudah sangat luar biasa.', 'Pelan-pelan saja, semua akan baik-baik saja.', 'Kamu mampu melewati harimu dengan sangat baik.'],
    3: ['Hari yang tenang tetap sangat berharga.', 'Kamu hadir seutuhnya hari ini, itu pencapaian besar.', 'Proses bertumbuh tidak selalu harus terburu-buru.'],
    2: ['Boleh merasa lelah, kamu manusia seutuhnya.', 'Perasaanmu valid. Berikan dirimu waktu untuk bernapas.', 'Kamu tidak sendirian melewati proses ini.'],
    1: ['Menyadari perasaan adalah langkah pertama pemulihan.', 'Satu langkah kecil pada satu waktu.', 'Istirahat adalah bagian dari pemulihan dirimu.']
  };
  const list = quotes[score] || quotes[3];
  return list[Math.floor(Math.random() * list.length)];
}

function renderStoryPreview() {
  const canvas = document.getElementById('story-canvas');
  if (!canvas || !currentEntry) return;

  const theme  = THEMES[currentThemeIdx];
  const mood   = currentEntry.mood;
  const photos = currentEntry.photos || [];
  const now    = new Date(currentEntry.ts || new Date());
  const dateStr = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'short' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });

  const intMap = {
    'Ringan': 33, 'Lumayan': 66, 'Berat': 100,
    'Tenang & Bersyukur': 33, 'Cukup Bersemangat': 66, 'Puncak Bahagia': 100,
    'Santai & Mengalir': 33, 'Cukup Seimbang': 66, 'Penuh Perenungan': 100,
    'Masih Terkendali': 33, 'Cukup Menguras': 66, 'Sangat Menyesakkan': 100,
  };
  const intPct = intMap[currentEntry.intensity] || 50;
  const causes = (currentEntry.causes || []).slice(0, 3);
  const quote  = getQuoteForMood(mood?.s || 3);

  // Common Header
  const headerHtml = `
    <div class="story-header" style="color:${theme.text}">
      <div class="story-brand">
        <img src="img/3d/3d-heart.png" class="story-3d-header-ic" alt="">
        <span class="story-app">moodly</span>
      </div>
      <div class="story-time-box">
        <span>${dateStr}</span>
        <span class="story-bullet">·</span>
        <span>${timeStr}</span>
      </div>
    </div>
  `;

  // Common Footer
  const footerHtml = `
    <div class="story-footer" style="color:${theme.text}">
      <div class="story-footer-txt">check in · track · grow</div>
      <div class="story-watermark">@moodly.app</div>
    </div>
  `;

  // Background blobs
  const blobsHtml = `
    <div class="story-blob story-blob-1" style="background:${theme.accent};opacity:0.25;filter:blur(50px)"></div>
    <div class="story-blob story-blob-2" style="background:${theme.accentLight};opacity:0.2;filter:blur(60px)"></div>
    <div class="story-particles">
      ${Array.from({length:6}, (_,i) => `<span style="left:${12+i*16}%;animation-delay:${i*0.4}s;opacity:${0.3+Math.random()*0.4}">${theme.particle}</span>`).join('')}
    </div>
  `;

  let bodyHtml = '';

  // ════════════════════════════════════════
  // TEMPLATE 1: POLAROID MEMORY
  // ════════════════════════════════════════
  if (currentTemplateId === 'polaroid') {
    const activePhoto = photos.length ? (photos[selectedPhotoIdx] || photos[0]) : null;

    bodyHtml = `
      <div class="story-polaroid-container">
        <!-- Polaroid Pin Decoration -->
        <div class="story-polaroid-pin">
          <img src="img/3d/3d-star.png" class="story-3d-star-pin" alt="">
        </div>

        <!-- Polaroid Card -->
        <div class="story-polaroid-card">
          <div class="story-polaroid-photo-frame">
            ${activePhoto ? `<img src="${activePhoto}" class="story-polaroid-img" alt="Momen">` : `
              <div class="story-photo-empty">
                <img src="img/3d/3d-sun.png" style="width:48px;height:48px;object-fit:contain" alt="">
                <span>Momen Spesial Hari Ini</span>
              </div>
            `}
          </div>
          <div class="story-polaroid-bottom">
            <div class="story-polaroid-meta">
              <div class="story-polaroid-3d-icon">
                ${getMood3DIconHtml(mood, 38)}
              </div>
              <div>
                <div class="story-polaroid-mood-title">${mood?.l || 'Biasa'}</div>
                <div class="story-polaroid-date">${dateStr}</div>
              </div>
            </div>
            <img src="img/3d/3d-heart.png" class="story-polaroid-heart-ic" alt="">
          </div>
        </div>

        <!-- Quote & Intensity below Polaroid -->
        <div class="story-bottom-info">
          <div class="story-quote" style="color:${theme.text}dd">"${quote}"</div>

          ${currentEntry.intensity ? `
            <div class="story-int-pill" style="background:${theme.cardBg};border:1px solid ${theme.accent}44;color:${theme.text}">
              <span class="story-int-dot" style="background:${theme.accent}"></span>
              <span>${currentEntry.intensity}</span>
            </div>
          ` : ''}

          ${causes.length ? `
            <div class="story-causes">
              ${causes.map(c => `<span class="story-chip" style="background:${theme.cardBg};color:${theme.text};border-color:${theme.accent}44">${c}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════
  // TEMPLATE 2: MULTI-PHOTO COLLAGE / GRID
  // ════════════════════════════════════════
  else if (currentTemplateId === 'grid') {
    let gridLayout = '';
    const pCount = photos.length;

    if (pCount === 0) {
      gridLayout = `
        <div class="story-photo-empty story-grid-empty" style="background:${theme.cardBg}">
          <img src="img/3d/3d-sun.png" style="width:52px;height:52px;object-fit:contain" alt="">
          <span>Tambah foto saat check-in untuk kolase estetik</span>
        </div>
      `;
    } else if (pCount === 1) {
      gridLayout = `
        <div class="story-grid-single">
          <img src="${photos[0]}" class="story-grid-img" alt="Foto">
        </div>
      `;
    } else if (pCount === 2) {
      gridLayout = `
        <div class="story-grid-duo">
          <div class="story-grid-cell"><img src="${photos[0]}" class="story-grid-img" alt=""></div>
          <div class="story-grid-cell"><img src="${photos[1]}" class="story-grid-img" alt=""></div>
        </div>
      `;
    } else if (pCount === 3) {
      gridLayout = `
        <div class="story-grid-trio">
          <div class="story-grid-cell trio-main"><img src="${photos[0]}" class="story-grid-img" alt=""></div>
          <div class="story-grid-subduo">
            <div class="story-grid-cell"><img src="${photos[1]}" class="story-grid-img" alt=""></div>
            <div class="story-grid-cell"><img src="${photos[2]}" class="story-grid-img" alt=""></div>
          </div>
        </div>
      `;
    } else {
      gridLayout = `
        <div class="story-grid-quad">
          <div class="story-grid-cell"><img src="${photos[0]}" class="story-grid-img" alt=""></div>
          <div class="story-grid-cell"><img src="${photos[1]}" class="story-grid-img" alt=""></div>
          <div class="story-grid-cell"><img src="${photos[2]}" class="story-grid-img" alt=""></div>
          <div class="story-grid-cell"><img src="${photos[3]}" class="story-grid-img" alt=""></div>
        </div>
      `;
    }

    bodyHtml = `
      <div class="story-grid-container">
        <!-- Foto Grid Display -->
        <div class="story-grid-frame">
          ${gridLayout}

          <!-- Floating Center 3D Mood Pill -->
          <div class="story-grid-floating-badge" style="background:rgba(20, 10, 16, 0.78);border:1.5px solid ${theme.accent}66;box-shadow:0 12px 30px rgba(0,0,0,0.5)">
            <div class="story-grid-3d-wrap">
              ${getMood3DIconHtml(mood, 50)}
            </div>
            <div>
              <div class="story-grid-mood-lbl" style="color:#ffffff">${mood?.l || 'Biasa'}</div>
              <div class="story-grid-date-lbl" style="color:rgba(255,255,255,0.7)">${currentEntry.intensity || 'Check-in'}</div>
            </div>
          </div>
        </div>

        <!-- Causes & Quote -->
        <div class="story-bottom-info" style="margin-top:14px">
          ${causes.length ? `
            <div class="story-causes">
              ${causes.map(c => `<span class="story-chip" style="background:${theme.cardBg};color:${theme.text};border-color:${theme.accent}44">${c}</span>`).join('')}
            </div>
          ` : ''}
          <div class="story-quote" style="color:${theme.text}dd;margin-top:8px">"${quote}"</div>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════
  // TEMPLATE 3: EDITORIAL MAGAZINE
  // ════════════════════════════════════════
  else if (currentTemplateId === 'editorial') {
    const activePhoto = photos.length ? (photos[selectedPhotoIdx] || photos[0]) : null;

    bodyHtml = `
      <div class="story-editorial-container">
        ${activePhoto ? `
          <div class="story-editorial-hero" style="background-image:url('${activePhoto}')">
            <div class="story-editorial-grad"></div>
          </div>
        ` : `
          <div class="story-editorial-hero-empty" style="background:${theme.cardBg}">
            <img src="img/3d/3d-sun.png" style="width:60px;height:60px;object-fit:contain" alt="">
          </div>
        `}

        <!-- Editorial Typography & Glassmorphism Card -->
        <div class="story-editorial-content">
          <div class="story-editorial-tag" style="color:${theme.accent}">DAILY MOOD REFLECTION</div>
          <div class="story-editorial-title" style="color:#ffffff">
            <span>FEELING</span><br>
            <span style="color:${theme.accentLight}">${(mood?.l || 'BIASA').toUpperCase()}</span>
          </div>

          <div class="story-editorial-card" style="background:rgba(255,255,255,0.14);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.25)">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
              ${getMood3DIconHtml(mood, 44)}
              <div>
                <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase">Tingkat Energi</div>
                <div style="font-size:14px;font-weight:800;color:#ffffff">${currentEntry.intensity || 'Stabil'}</div>
              </div>
            </div>
            <div class="story-quote" style="color:#ffffff;max-width:100%;font-size:12px;text-align:left">"${quote}"</div>
          </div>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════
  // TEMPLATE 4: PURE MOOD MINIMALIST
  // ════════════════════════════════════════
  else {
    bodyHtml = `
      <div class="story-minimal-container">
        <!-- Floating 3D Star & Heart -->
        <div class="story-3d-decor-wrap">
          <img src="img/3d/3d-star.png" class="story-3d-star-fl" alt="">
          <img src="img/3d/3d-heart.png" class="story-3d-heart-fl" alt="">
        </div>

        <div class="story-center">
          <div class="story-em-wrap" style="background:${theme.cardBg};box-shadow:0 16px 40px rgba(0,0,0,0.25);border:2px solid ${theme.accent}33">
            ${getMood3DIconHtml(mood, 80)}
          </div>
          <div class="story-mood-name" style="color:${theme.text};margin-top:14px">${mood?.l || 'Biasa'}</div>
          <div class="story-quote" style="color:${theme.text}dd;margin-top:8px">"${quote}"</div>
        </div>

        ${currentEntry.intensity ? `
          <div class="story-int-wrap" style="margin-top:20px">
            <div class="story-int-label" style="color:${theme.text}99">Intensitas Perasaan · ${currentEntry.intensity}</div>
            <div class="story-int-track" style="background:${theme.accent}22">
              <div class="story-int-fill" style="width:${intPct}%;background:${theme.accent}"></div>
            </div>
          </div>
        ` : ''}

        ${causes.length ? `
          <div class="story-causes" style="margin-top:16px">
            ${causes.map(c => `<span class="story-chip" style="background:${theme.cardBg};color:${theme.text};border-color:${theme.accent}44">${c}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  canvas.innerHTML = `
    <div id="story-frame" class="story-frame tpl-${currentTemplateId}" style="background:${theme.bg}">
      ${blobsHtml}
      ${headerHtml}
      <div class="story-main-area">
        ${bodyHtml}
      </div>
      ${footerHtml}
    </div>
  `;
}

/* ════════════════
   TEMPLATE SELECTOR
════════════════ */
function renderTemplateSelector() {
  const bar = document.getElementById('story-templates-bar');
  if (!bar) return;

  bar.innerHTML = TEMPLATES.map(t => `
    <button class="story-tpl-btn ${t.id === currentTemplateId ? 'on' : ''}" onclick="window._setStoryTemplate('${t.id}')">
      <span class="story-tpl-ic">${t.icon}</span>
      <span class="story-tpl-name">${t.name}</span>
    </button>
  `).join('');
}

export function setStoryTemplate(id) {
  currentTemplateId = id;
  renderTemplateSelector();
  renderPhotoPicker();
  renderStoryPreview();
}
window._setStoryTemplate = setStoryTemplate;

/* ════════════════
   PHOTO PICKER (FOR FOCUS)
════════════════ */
function renderPhotoPicker() {
  const wrap = document.getElementById('story-photo-picker-wrap');
  const picker = document.getElementById('story-photo-picker');
  if (!wrap || !picker) return;

  const photos = currentEntry?.photos || [];
  if (photos.length > 1 && (currentTemplateId === 'polaroid' || currentTemplateId === 'editorial')) {
    wrap.style.display = 'block';
    picker.innerHTML = photos.map((src, i) => `
      <div class="story-photo-opt ${i === selectedPhotoIdx ? 'on' : ''}" onclick="window._selectStoryPhoto(${i})">
        <img src="${src}" alt="Foto ${i+1}">
      </div>
    `).join('');
  } else {
    wrap.style.display = 'none';
  }
}

export function selectStoryPhoto(idx) {
  selectedPhotoIdx = idx;
  renderPhotoPicker();
  renderStoryPreview();
}
window._selectStoryPhoto = selectStoryPhoto;

/* ════════════════
   THEME SELECTOR
════════════════ */
function renderThemeSelector() {
  const wrap = document.getElementById('story-themes');
  if (!wrap) return;
  wrap.innerHTML = THEMES.map((t, i) => `
    <button class="story-theme-btn ${i === currentThemeIdx ? 'on' : ''}"
      style="background:${t.bg}" onclick="window._storyTheme(${i})">
      <span class="story-theme-name">${t.name}</span>
    </button>
  `).join('');
}

export function setStoryTheme(idx) {
  currentThemeIdx = idx;
  renderThemeSelector();
  renderStoryPreview();
}

/* ════════════════
   DOWNLOAD / SHARE
════════════════ */
export async function downloadStory() {
  const frame = document.getElementById('story-frame');
  if (!frame) return;

  if (typeof html2canvas === 'undefined') {
    if (window._moodlyAlert) {
      window._moodlyAlert({
        icon: 'img/3d/3d-star.png',
        title: 'Screenshot Story',
        msg: 'Gunakan screenshot HP kamu untuk membagikan story ini ke Instagram ya!'
      });
    }
    return;
  }

  try {
    if (window._moodlyToast) window._moodlyToast('Memproses gambar Instagram Story...');
    const canvas = await html2canvas(frame, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });
    const link = document.createElement('a');
    link.download = `moodly-story-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    if (window._moodlyToast) window._moodlyToast('Story siap dibagikan ke Instagram! 📸');
  } catch (e) {
    console.warn('[stories] download failed:', e);
  }
}

export async function shareStory() {
  const frame = document.getElementById('story-frame');
  if (!frame) return;

  if (navigator.share && typeof html2canvas !== 'undefined') {
    try {
      if (window._moodlyToast) window._moodlyToast('Menyiapkan gambar untuk Instagram...');
      const canvas = await html2canvas(frame, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) { downloadStory(); return; }
        const file = new File([blob], `moodly-story-${Date.now()}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Moodly Story',
              text: `Mood hari ini: ${currentEntry?.mood?.l} ✨`,
            });
            return;
          } catch(e) {
            return;
          }
        }
        downloadStory();
      }, 'image/png');
      return;
    } catch(e) {
      console.warn('Share file fallback:', e);
    }
  }

  downloadStory();
}

/* ════════════════
   CLOSE
════════════════ */
export function closeStories() {
  document.getElementById('stories-modal')?.classList.remove('show');
}

/* ════════════════
   GLOBAL BINDINGS
════════════════ */
window._storyTheme    = setStoryTheme;
window._downloadStory = downloadStory;
window._shareStory    = shareStory;
window._closeStories  = closeStories;
