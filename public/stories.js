/* ═══════════════════════════════════════
   MOODLY — stories.js
   Mood Stories: IG-style card generator
   User bisa share mood sebagai gambar/story
   ═══════════════════════════════════════ */

/* ════════════════
   STORY THEMES
════════════════ */
const THEMES = [
  {
    id: 'forest',
    name: 'Forest',
    bg: 'linear-gradient(160deg, #0a3d1f 0%, #1a6b3a 50%, #0d8c3e 100%)',
    accent: '#4ade80',
    text: '#e8faf0',
    particle: '🌿',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bg: 'linear-gradient(160deg, #1a0a2e 0%, #4a1942 50%, #c0392b 100%)',
    accent: '#f97316',
    text: '#fff5f0',
    particle: '✨',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bg: 'linear-gradient(160deg, #0c1445 0%, #1a4a8a 50%, #2980b9 100%)',
    accent: '#38bdf8',
    text: '#f0f9ff',
    particle: '🌊',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    bg: 'linear-gradient(160deg, #3b0764 0%, #7c3aed 50%, #db2777 100%)',
    accent: '#f9a8d4',
    text: '#fdf2f8',
    particle: '🌸',
  },
  {
    id: 'night',
    name: 'Night',
    bg: 'linear-gradient(160deg, #020617 0%, #0f172a 60%, #1e293b 100%)',
    accent: '#818cf8',
    text: '#f1f5f9',
    particle: '⭐',
  },
];

/* ════════════════
   STATE
════════════════ */
let currentThemeIdx = 0;
let currentEntry    = null;

/* ════════════════
   OPEN STORIES MODAL
════════════════ */
export function openStories(entry) {
  currentEntry    = entry;
  currentThemeIdx = 0;

  const modal = document.getElementById('stories-modal');
  if (!modal) return;

  // Set initial theme selector
  renderThemeSelector();
  renderStoryPreview();
  modal.classList.add('show');
}

/* ════════════════
   RENDER PREVIEW
════════════════ */
function renderStoryPreview() {
  const canvas = document.getElementById('story-canvas');
  if (!canvas || !currentEntry) return;

  const theme = THEMES[currentThemeIdx];
  const mood  = currentEntry.mood;
  const now   = new Date(currentEntry.ts || new Date());
  const dateStr = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long' });
  const timeStr = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });

  // Intensity bar fill
  const intMap = { 'Ringan': 33, 'Lumayan': 66, 'Berat': 100 };
  const intPct = intMap[currentEntry.intensity] || 50;

  // Causes chips
  const causes = (currentEntry.causes || []).slice(0, 3);

  // Motivational quotes by mood score
  const quotes = {
    5: ['Energi kamu tuh menular banget 🌟', 'Hari ini milik kamu sepenuhnya ✨', 'Kebahagiaan kamu valid & berharga 💛'],
    4: ['Oke itu udah lebih dari cukup 🌱', 'Pelan-pelan, kamu baik-baik aja 💚', 'Kamu handle segalanya dengan bagus!'],
    3: ['Hari datar pun tetap berharga 🌤️', 'Kamu masih di sini, itu keren banget', 'Proses itu nggak selalu terasa dramatis'],
    2: ['Boleh ngerasa berat, kamu manusia', 'Kesedihan itu tanda hati yang masih hidup 💙', 'Kamu nggak sendirian melewati ini'],
    1: ['Berani check-in itu udah kuat banget 🫂', 'Satu hari pada satu waktu aja', 'Rest is productive. Istirahat dulu ya.'],
  };
  const moodScore = mood?.s || 3;
  const quoteList = quotes[moodScore] || quotes[3];
  const quote = quoteList[Math.floor(Math.random() * quoteList.length)];

  canvas.innerHTML = `
    <div class="story-frame" style="background:${theme.bg}" id="story-frame">
      <!-- Decorative blobs -->
      <div class="story-blob story-blob-1" style="background:${theme.accent}22"></div>
      <div class="story-blob story-blob-2" style="background:${theme.accent}11"></div>

      <!-- Header -->
      <div class="story-header" style="color:${theme.text}88">
        <span class="story-app">🌱 moodly</span>
        <span class="story-time">${timeStr} · ${dateStr}</span>
      </div>

      <!-- Main mood -->
      <div class="story-center">
        <div class="story-em-wrap" style="background:${theme.accent}22;border:2px solid ${theme.accent}44">
          <span class="story-em">${mood?.e || '😐'}</span>
        </div>
        <div class="story-mood-name" style="color:${theme.text}">${mood?.l || 'Biasa'}</div>
        <div class="story-quote" style="color:${theme.text}cc">${quote}</div>
      </div>

      <!-- Intensity bar -->
      ${currentEntry.intensity ? `
      <div class="story-int-wrap">
        <div class="story-int-label" style="color:${theme.text}88">Intensitas · ${currentEntry.intensity}</div>
        <div class="story-int-track" style="background:${theme.accent}22">
          <div class="story-int-fill" style="width:${intPct}%;background:${theme.accent}"></div>
        </div>
      </div>` : ''}

      <!-- Cause chips -->
      ${causes.length ? `
      <div class="story-causes">
        ${causes.map(c => `<span class="story-chip" style="background:${theme.accent}22;color:${theme.accent};border-color:${theme.accent}44">${c}</span>`).join('')}
      </div>` : ''}

      <!-- Particle decoration -->
      <div class="story-particles">
        ${Array.from({length:8}, (_,i) => `<span style="left:${10+i*11}%;animation-delay:${i*0.4}s;opacity:${0.3+Math.random()*0.4}">${theme.particle}</span>`).join('')}
      </div>

      <!-- Bottom watermark -->
      <div class="story-footer" style="color:${theme.text}55">
        check in · track · grow
      </div>
    </div>
  `;
}

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

  // html2canvas approach
  if (typeof html2canvas === 'undefined') {
    // Fallback: show instructions
    window._moodlyAlert({
      icon: '📤',
      title: 'Screenshot Manual',
      msg: 'Tekan tombol power+volume bawah (Android) atau power+home (iOS) untuk screenshot, lalu share ke Stories!'
    });
    return;
  }

  try {
    const canvas = await html2canvas(frame, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });
    const link = document.createElement('a');
    link.download = `moodly-story-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (e) {
    console.warn('[stories] download failed:', e);
  }
}

/* ════════════════
   SHARE via Web Share API
════════════════ */
export async function shareStory() {
  // Try Web Share API first (mobile)
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Moodly — Mood Check-in',
        text: `Mood hari ini: ${currentEntry?.mood?.e} ${currentEntry?.mood?.l} · Cek mood kamu juga di Moodly 🌱`,
        url: window.location.href,
      });
      return;
    } catch {}
  }
  // Fallback to download
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