/* ═══════════════════════════════════════
   MOODLY — stories.js
   Mood Card Generator (Square 1:1 for Instagram)
   • Strict 1:1 Square Card (1080x1080 HD Export)
   • Instagram auto-adapts 1:1 cards perfectly in Stories
   • All photos strictly cropped to fill (object-fit: cover, never shrunk)
   • Elegant Poppins Typography & Title Case (No All-Caps)
   • Solid Background Colors (Putih, Pink, Custom Color Picker, No Gradients)
   • 2-Tone moodly Logo Centered at Bottom
   • 100% 3D Renders (No Memojis/Unclear Emojis)
   ═══════════════════════════════════════ */

/* ════════════════
   STORY TEMPLATES
════════════════ */
const TEMPLATES = [
  {
    id: 'polaroid',
    name: 'Polaroid',
    svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>',
    desc: 'Frame Foto Vintage'
  },
  {
    id: 'grid',
    name: 'Kolase Grid',
    svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
    desc: 'Kolase Multi-Foto'
  },
  {
    id: 'editorial',
    name: 'Editorial',
    svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>',
    desc: 'Hero Photo Majalah'
  },
  {
    id: 'minimal',
    name: 'Minimalis',
    svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>',
    desc: '3D Art Card'
  },
];

/* ════════════════
   SOLID BACKGROUND COLORS (NO GRADIENTS)
════════════════ */
const SOLID_COLORS = [
  { id: 'white',      name: 'Putih Bersih',  hex: '#ffffff' },
  { id: 'soft-pink',  name: 'Pink Lembut',   hex: '#fff0f3' },
  { id: 'blush-pink', name: 'Blush Pink',    hex: '#ffe4ea' },
  { id: 'rose-pink',  name: 'Rose Pastel',   hex: '#ffd1dc' },
  { id: 'warm-cream', name: 'Krem Hangat',   hex: '#faf8f5' },
  { id: 'charcoal',   name: 'Charcoal Dark', hex: '#18181b' },
];

/* ════════════════
   STATE
════════════════ */
let currentColorHex   = '#ffffff'; // Default: Clean Solid White
let currentTemplateId = 'polaroid';
let selectedPhotoIdx  = 0;
let currentEntry      = null;

/* ════════════════
   COLOR LUMINANCE HELPER
════════════════ */
function isDarkColor(hex) {
  if (!hex) return false;
  let c = hex.replace('#', '');
  if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  const r = parseInt(c.substr(0, 2), 16) || 255;
  const g = parseInt(c.substr(2, 2), 16) || 255;
  const b = parseInt(c.substr(4, 2), 16) || 255;
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq < 135;
}

function getThemeStyles(hex) {
  const isDark = isDarkColor(hex);
  return {
    bg: hex,
    isDark,
    text: isDark ? '#ffffff' : '#1c1c1e',
    textMuted: isDark ? 'rgba(255, 255, 255, 0.68)' : 'rgba(28, 28, 30, 0.60)',
    cardBg: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.07)',
    cardShadow: isDark ? '0 10px 26px rgba(0,0,0,0.45)' : '0 10px 26px rgba(0,0,0,0.06)',
    chipBg: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.04)',
    chipBorder: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.08)',
    accent: '#ff2d55',
  };
}

/* ════════════════
   OPEN STORIES MODAL
════════════════ */
export function openStories(entry) {
  currentEntry = entry;
  currentColorHex = '#ffffff';
  selectedPhotoIdx = 0;

  // Auto-detect template
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
   3D ICON & TITLE CASE HELPERS
════════════════ */
function getMood3DIconHtml(mood, size = 56) {
  if (mood && mood.img) {
    return `<img src="${mood.img}" class="story-3d-main-img" style="width:${size}px;height:${size}px;object-fit:contain" alt="${mood.l}">`;
  }
  return `<img src="img/3d/3d-heart.png" class="story-3d-main-img" style="width:${size}px;height:${size}px;object-fit:contain" alt="Moodly">`;
}

function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function getQuoteForMood(score) {
  const quotes = {
    5: [
      'Hari yang indah untuk disyukuri dan dinikmati.',
      'Energi positifmu mengalir dengan hangat hari ini.',
      'Setiap momen bahagia layak untuk dirayakan.'
    ],
    4: [
      'Pelan tapi pasti, harimu berjalan dengan sangat baik.',
      'Menikmati proses dan hal-hal sederhana hari ini.',
      'Ketenangan hati adalah kebahagiaan yang nyata.'
    ],
    3: [
      'Hari yang tenang dan mengalir apa adanya.',
      'Hadir seutuhnya di hari ini sudah sangat berarti.',
      'Setiap proses bertumbuh punya ritmenya sendiri.'
    ],
    2: [
      'Istirahat sejenak adalah bentuk kepedulian pada dirimu.',
      'Tarik napas perlahan, semuanya akan baik-baik saja.',
      'Perasaanmu valid. Beri ruang tenang untuk dirimu.'
    ],
    1: [
      'Satu langkah kecil hari ini adalah awal kebaikan baru.',
      'Jaga dirimu dengan penuh kasih dan kesabaran.',
      'Hari esok selalu membawa harapan dan ruang baru.'
    ]
  };
  const list = quotes[score] || quotes[3];
  return list[Math.floor(Math.random() * list.length)];
}

/* ════════════════
   RENDER STORY PREVIEW (KOTAK 1:1)
════════════════ */
function renderStoryPreview() {
  const canvas = document.getElementById('story-canvas');
  if (!canvas || !currentEntry) return;

  const theme  = getThemeStyles(currentColorHex);
  const mood   = currentEntry.mood;
  const photos = currentEntry.photos || [];
  const now    = new Date(currentEntry.ts || new Date());
  const dateStr = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'short' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }).replace(':', '.');

  const intMap = {
    'Ringan': 33, 'Lumayan': 66, 'Berat': 100,
    'Tenang & Bersyukur': 33, 'Cukup Bersemangat': 66, 'Puncak Bahagia': 100,
    'Santai & Mengalir': 33, 'Cukup Seimbang': 66, 'Penuh Perenungan': 100,
    'Masih Terkendali': 33, 'Cukup Menguras': 66, 'Sangat Menyesakkan': 100,
  };
  const intPct = intMap[currentEntry.intensity] || 50;
  const causes = (currentEntry.causes || []).slice(0, 3);
  const quote  = getQuoteForMood(mood?.s || 3);
  const moodLabel = toTitleCase(mood?.l || 'Biasa');

  // Top Minimalist Meta
  const topMetaHtml = `
    <div class="story-top-meta" style="color:${theme.textMuted}">
      <span>${dateStr}</span>
      <span class="story-dot-sep">·</span>
      <span>${timeStr}</span>
    </div>
  `;

  // Bottom 2-Tone Moodly Logo (mood dark/light + ly pink)
  const isEditorial = currentTemplateId === 'editorial' && photos.length > 0;
  const logoMoodColor = isEditorial ? '#ffffff' : (theme.isDark ? '#ffffff' : '#1c1c1e');
  const footerLogoHtml = `
    <div class="story-brand-bottom">
      <span class="story-logo-mood" style="color:${logoMoodColor}">mood</span><span class="story-logo-ly">ly</span>
    </div>
  `;

  let bodyHtml = '';

  // ════════════════════════════════════════
  // TEMPLATE 1: POLAROID (1:1 KOTAK & CROPPED)
  // ════════════════════════════════════════
  if (currentTemplateId === 'polaroid') {
    const activePhoto = photos.length ? (photos[selectedPhotoIdx] || photos[0]) : null;

    bodyHtml = `
      <div class="story-polaroid-container">
        <div class="story-polaroid-card">
          <div class="story-polaroid-photo-frame">
            ${activePhoto ? `<img src="${activePhoto}" class="story-polaroid-img" alt="Foto">` : `
              <div class="story-photo-empty">
                <img src="img/3d/3d-sun.png" style="width:36px;height:36px;object-fit:contain" alt="">
                <span>Momen Hari Ini</span>
              </div>
            `}
          </div>
          <div class="story-polaroid-bottom">
            <div class="story-polaroid-meta">
              <div class="story-polaroid-3d-icon">
                ${getMood3DIconHtml(mood, 28)}
              </div>
              <div>
                <div class="story-polaroid-mood-title">${moodLabel}</div>
                <div class="story-polaroid-date">${dateStr}</div>
              </div>
            </div>
            <img src="img/3d/3d-heart.png" class="story-polaroid-heart-ic" alt="">
          </div>
        </div>

        <div class="story-bottom-info">
          <div class="story-quote" style="color:${theme.text}">"${quote}"</div>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════
  // TEMPLATE 2: MULTI-PHOTO GRID (1:1 KOTAK & CROPPED)
  // ════════════════════════════════════════
  else if (currentTemplateId === 'grid') {
    let gridLayout = '';
    const pCount = photos.length;

    if (pCount === 0) {
      gridLayout = `
        <div class="story-photo-empty story-grid-empty" style="background:${theme.chipBg};color:${theme.textMuted}">
          <img src="img/3d/3d-sun.png" style="width:42px;height:42px;object-fit:contain" alt="">
          <span>Tambah foto saat check-in untuk kolase</span>
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
        <div class="story-grid-frame">
          ${gridLayout}

          <!-- Floating Badge -->
          <div class="story-grid-floating-badge" style="background:${theme.isDark ? 'rgba(24, 24, 27, 0.92)' : 'rgba(255, 255, 255, 0.96)'};border:1px solid ${theme.cardBorder};box-shadow:${theme.cardShadow}">
            <div class="story-grid-3d-wrap">
              ${getMood3DIconHtml(mood, 32)}
            </div>
            <div>
              <div class="story-grid-mood-lbl" style="color:${theme.text}">${moodLabel}</div>
              <div class="story-grid-date-lbl" style="color:${theme.textMuted}">${currentEntry.intensity || 'Refleksi'}</div>
            </div>
          </div>
        </div>

        <div class="story-bottom-info">
          <div class="story-quote" style="color:${theme.text}">"${quote}"</div>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════
  // TEMPLATE 3: EDITORIAL (FULL SQUARE HERO CROP)
  // ════════════════════════════════════════
  else if (currentTemplateId === 'editorial') {
    const activePhoto = photos.length ? (photos[selectedPhotoIdx] || photos[0]) : null;

    bodyHtml = `
      <div class="story-editorial-container">
        ${activePhoto ? `
          <img src="${activePhoto}" class="story-editorial-hero-img" alt="Foto">
          <div class="story-editorial-overlay"></div>
        ` : `
          <div class="story-editorial-hero-empty" style="background:${theme.chipBg}">
            <img src="img/3d/3d-sun.png" style="width:46px;height:46px;object-fit:contain" alt="">
          </div>
        `}

        <div class="story-editorial-content">
          <div class="story-editorial-tag">Refleksi Mood Hari Ini</div>
          <div class="story-editorial-title">
            <span>Merasa</span> <span style="color:#ff85a1">${moodLabel}</span>
          </div>

          <div class="story-editorial-card">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              ${getMood3DIconHtml(mood, 28)}
              <div>
                <div style="font-size:9px;font-weight:600;color:rgba(255,255,255,0.8)">Intensitas Perasaan</div>
                <div style="font-size:11.5px;font-weight:700;color:#ffffff">${currentEntry.intensity || 'Stabil'}</div>
              </div>
            </div>
            <div class="story-quote" style="color:#ffffff;max-width:100%;font-size:10px;text-align:left">"${quote}"</div>
          </div>
        </div>
      </div>
    `;
  }

  // ════════════════════════════════════════
  // TEMPLATE 4: PURE MOOD MINIMALIST (1:1 KOTAK)
  // ════════════════════════════════════════
  else {
    bodyHtml = `
      <div class="story-minimal-container">
        <div class="story-center">
          <div class="story-em-wrap" style="background:${theme.cardBg};box-shadow:${theme.cardShadow};border:1.5px solid ${theme.cardBorder}">
            ${getMood3DIconHtml(mood, 68)}
          </div>
          <div class="story-mood-name" style="color:${theme.text};margin-top:10px">${moodLabel}</div>
          <div class="story-quote" style="color:${theme.text};margin-top:6px">"${quote}"</div>
        </div>

        ${currentEntry.intensity ? `
          <div class="story-int-wrap" style="margin-top:12px">
            <div class="story-int-label" style="color:${theme.textMuted}">Intensitas Perasaan · ${currentEntry.intensity}</div>
            <div class="story-int-track" style="background:${theme.chipBg}">
              <div class="story-int-fill" style="width:${intPct}%;background:${theme.accent}"></div>
            </div>
          </div>
        ` : ''}

        ${causes.length ? `
          <div class="story-causes" style="margin-top:10px">
            ${causes.map(c => `<span class="story-chip" style="background:${theme.chipBg};color:${theme.text};border-color:${theme.chipBorder}">${toTitleCase(c)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  canvas.innerHTML = `
    <div id="story-frame" class="story-frame tpl-${currentTemplateId}" style="background-color:${theme.bg};color:${theme.text};">
      ${currentTemplateId !== 'editorial' ? topMetaHtml : ''}
      <div class="story-main-area">
        ${bodyHtml}
      </div>
      ${footerLogoHtml}
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
      <span class="story-tpl-ic">${t.svg}</span>
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
  const bar  = document.getElementById('story-photo-picker');
  if (!wrap || !bar) return;

  const photos = currentEntry?.photos || [];
  if (photos.length <= 1 || currentTemplateId === 'grid' || currentTemplateId === 'minimal') {
    wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';
  bar.innerHTML = photos.map((p, idx) => `
    <div class="story-photo-opt ${idx === selectedPhotoIdx ? 'on' : ''}" onclick="window._selectStoryPhoto(${idx})">
      <img src="${p}" alt="Foto ${idx + 1}">
    </div>
  `).join('');
}

export function selectStoryPhoto(idx) {
  selectedPhotoIdx = idx;
  renderPhotoPicker();
  renderStoryPreview();
}
window._selectStoryPhoto = selectStoryPhoto;

/* ════════════════
   SOLID COLOR SELECTOR (PUTIH, PINK, PICK COLOR SENDIRI)
════════════════ */
function renderThemeSelector() {
  const wrap = document.getElementById('story-themes');
  if (!wrap) return;

  const swatchesHtml = SOLID_COLORS.map(c => {
    const isCurrent = c.hex.toLowerCase() === currentColorHex.toLowerCase();
    return `
      <button class="story-color-btn ${isCurrent ? 'on' : ''}"
        style="background-color:${c.hex}"
        onclick="window._setStorySolidColor('${c.hex}')"
        title="${c.name}">
        ${isCurrent ? '<span class="story-color-check"></span>' : ''}
      </button>
    `;
  }).join('');

  const isPreset = SOLID_COLORS.some(c => c.hex.toLowerCase() === currentColorHex.toLowerCase());

  const customHtml = `
    <label class="story-color-btn story-color-custom ${!isPreset ? 'on' : ''}" title="Pilih Warna Sendiri">
      <input type="color" id="story-custom-color" value="${currentColorHex}" onchange="window._setCustomStoryColor(this.value)">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 8v8M8 12h8"></path>
      </svg>
    </label>
  `;

  wrap.innerHTML = `<div class="story-colors-row">${swatchesHtml}${customHtml}</div>`;
}

export function setStorySolidColor(hex) {
  currentColorHex = hex;
  renderThemeSelector();
  renderStoryPreview();
}
window._setStorySolidColor = setStorySolidColor;
window._storyTheme = setStorySolidColor;

export function setCustomStoryColor(hex) {
  if (!hex) return;
  currentColorHex = hex;
  renderThemeSelector();
  renderStoryPreview();
}
window._setCustomStoryColor = setCustomStoryColor;

/* ════════════════
   DOWNLOAD / SHARE (SQUARE 1:1 1080x1080 FOR INSTAGRAM)
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
    if (window._moodlyToast) window._moodlyToast('Menyiapkan gambar kartu...');

    // Scale precisely to 1080x1080 px (1:1 square)
    const targetSize = 1080;
    const currentWidth = frame.offsetWidth || 320;
    const exportScale = targetSize / currentWidth;

    const canvas = await html2canvas(frame, {
      scale: exportScale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false,
    });
    const link = document.createElement('a');
    link.download = `moodly-card-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    if (window._moodlyToast) window._moodlyToast('Kartu siap dibagikan ke Instagram!');
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

      const targetSize = 1080;
      const currentWidth = frame.offsetWidth || 320;
      const exportScale = targetSize / currentWidth;

      const canvas = await html2canvas(frame, {
        scale: exportScale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) { downloadStory(); return; }
        const file = new File([blob], `moodly-card-${Date.now()}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Moodly Story Card',
              text: `Mood hari ini: ${toTitleCase(currentEntry?.mood?.l || 'Check-in')}`,
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
window._downloadStory = downloadStory;
window._shareStory    = shareStory;
window._closeStories  = closeStories;
