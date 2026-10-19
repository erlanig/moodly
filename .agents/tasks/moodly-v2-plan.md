# Moodly v2 — Implementation Plan (STATUS: COMPLETED & ENHANCED)

_Fully implemented: iOS Pink Redesign, 6-Digit Admin Passcode Lock Screen, Giur Bistro Birthday Date Invitation Gimmick, 114 Surah with Audio Tilawah & Digital Tasbih, Groq AI Chat Retry/Fallback, Daily Article Bookmarking, and Modern Admin Dashboard._

---

## Executive Summary & What Was Implemented

1. **Dominan Warna Pink (iOS Aesthetic):**
   - Theme transformed across all components to an Apple-inspired iOS Rose/Blush Pink (`--p1: #ff2d55`, `--p2: #ff5e8a`, `--bg: #fff5f8`, `--border: #fedbe4`, `--gl: linear-gradient(135deg, #fff0f4, #ffe3eb)`).
   - Glassmorphism, SF-pro iOS typography stack, squircle cards, animated active states, and bottom navigation with translucent frosted glass.

2. **iOS Passcode Lock Screen (6-Digit PIN):**
   - Authentic iOS keypad (1-9 with alphabet subtext, 0, backspace `⌫`).
   - 6 animated passcode indicator dots with pink glow and shake animation on error.
   - Synchronized with Firestore (`system/config`) and editable anytime in the Admin Dashboard (`admin.html`). Default PIN: `241026`.

3. **Gimmick Spesial Kencan & Ulang Tahun (Giur Bistro):**
   - Pop-up modal with animated Giur Bistro illustration, live countdown timer to **Sabtu, 24 Oktober 2026, 15:00 WIB**.
   - Lokasi: **Giur Bistro** (Jl. Aria Jipang No. 1-3, Citarum, Bandung Wetan, Bandung) with direct Google Maps launch button.
   - Dress code alert: "Outfit cerah dengan nuansa biru muda 👗🩵".
   - Interactive RSVP button ("Aku Pasti Datang! 💖🥰") with response tracking directly visible to admin.
   - Persistent floating card on home screen so user can re-open the invitation anytime.

4. **Al-Quran 114 Surah, Tilawah Audio & Tasbih Digital:**
   - 114 Surah catalog with instant search, Makkiyah/Madaniyah/Favorit filters, and ❤️ favorites.
   - Reciter audio playback per ayah (`ar.alafasy`).
   - Font resize controls (A-, A, A+).
   - Digital Tasbih with presets (Subhanallah 33, Alhamdulillah 33, Allahu Akbar 33, Astaghfirullah 100, Shalawat 100), haptic vibration, and progress ring.
   - Expanded 30+ categorized Doa & 20+ curated Kajian.

5. **AI Chat & Artikel Harian:**
   - Groq API retry mechanism & fallback model (`llama-3.1-8b-instant`) in `api/chat.js`.
   - Real-time daily articles caching (`todayKey()`), reading progress bar, bookmarking, and "Islam & Psikologi" category.

6. **Admin Dashboard v2 (`admin.html`):**
   - Protected admin authentication gate.
   - Passcode manager (view, update, enable/disable 6-digit PIN).
   - Birthday date RSVP tracker.
   - Global analytics, user check-in history, CSV export, and cache invalidator.

**Recommended execution order:** P0 → P1 → P2 → P3 → P4+P5 (P4 and P5 can be done together)

---

## Task List

---

### TASK P0 — Fix AI Chat (Groq)

**Complexity:** S  
**Files:** `api/chat.js`, `public/chat.js`  
**Dependencies:** none

#### What's broken (evidence)
- `api/chat.js` lines 28–48: single `fetch()` to Groq, no retry, no fallback model. If Groq returns 429/503, the function returns the raw error body as JSON `{ error: "..." }` to the client.
- `public/chat.js` lines 91–97: `catch(e)` block shows a generic message. `data.error` check on line 130 throws, which is then caught and shows the generic message. User never sees the actual error code.

#### Changes — `api/chat.js`
1. Extract the Groq fetch into a helper `async function callGroq(messages, model, apiKey)`.
2. Try primary model `llama-3.3-70b-versatile`. On failure (non-ok status), log the error with `console.error('[api/chat] primary failed:', status, body)`.
3. Retry: wait 1s, try primary again.
4. On second failure, try fallback `llama3-8b-8192` immediately (no wait).
5. On all failures, return `res.status(502).json({ error: 'Groq unavailable', status: groqRes.status, model: modelTried })`.
6. On success, return `res.status(200).json({ reply, model: modelUsed })` — include which model answered.

```js
// Pseudocode shape
async function callGroq(messages, model, apiKey) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, max_tokens: 400, temperature: 0.8, messages }),
  });
  return r; // return raw response, let caller decide
}

// In handler:
let groqRes = await callGroq(messages, 'llama-3.3-70b-versatile', apiKey);
if (!groqRes.ok) {
  console.error('[api/chat] primary attempt 1 failed:', groqRes.status);
  await new Promise(r => setTimeout(r, 1000));
  groqRes = await callGroq(messages, 'llama-3.3-70b-versatile', apiKey);
}
if (!groqRes.ok) {
  console.error('[api/chat] primary attempt 2 failed, trying fallback');
  groqRes = await callGroq(messages, 'llama3-8b-8192', apiKey);
  modelUsed = 'llama3-8b-8192';
}
if (!groqRes.ok) {
  const errBody = await groqRes.text();
  return res.status(502).json({ error: `Groq error ${groqRes.status}`, detail: errBody });
}
```

#### Changes — `public/chat.js`
- In `sendMessage()` catch block (currently line 94): replace generic message with error-specific messages:
  - `502` → "Jes lagi sibuk banget sekarang 😅 Coba lagi dalam 1–2 menit ya."  
  - `429` → "Terlalu banyak percakapan sekarang, Jes perlu istirahat sebentar 🙏 Coba 30 detik lagi."  
  - `500` → "Ada masalah di server Moodly. Kami sudah tahu dan sedang diperbaiki 🛠️"  
  - Network error (no response) → "Cek koneksi internet kamu ya, Jes nggak bisa nyambung 📡"
- Parse `e.message` for HTTP status code to pick the right message.
- After showing error, re-enable input so user can retry (currently input stays disabled on error — check `setInputState(true)` is called in finally block, not only try block).

**Verify:**
```bash
# Deploy ke Vercel preview, buka chat, kirim pesan
# Expected: balasan muncul dalam 2-3 detik
# Test failure: matikan GROQ_API_KEY sementara → expected: pesan error spesifik muncul, bukan spinner hang
```

---

### TASK P1 — Artikel Harian Real-Time

**Complexity:** M  
**Files:** `public/news.js`, `public/styles.css`, `public/firebase.js`, `public/index.html`  
**Dependencies:** none

#### Sub-tasks

**P1.1 — Cache key harian (`news.js`)**
- Ganti fungsi `slotKey()` → `function todayKey()` yang return `'${year}-${MM}-${DD}'` (tanpa slot).
- Update `initNews()`: ganti `slotKey()` → `todayKey()` pada semua 3 lokasi (`cacheValid` check, `saveNewsCache` call, `forceRefresh` invalidation).
- Ganti `slotLabel()` dari "Pagi/Siang/Malam" ke format "Hari Ini" di `date-pill`.
- Update `TOPICS` rotation: hash dari `todayKey()` bukan slot key — 1 set topik per hari.

**P1.2 — Upgrade prompt Claude (`news.js`)**
- Ubah variabel `prompt` di `loadArticles()`:
  - Minimum konten: ganti "min 400 kata" → "min 500 kata"
  - Tambahkan instruksi: "Format berita terkini sebagai blockquote callout dengan prefix '📰 Berita Terkini:' jika ada berita aktual yang relevan"
  - Ubah `readTime` di JSON schema: field `readTime` tetap, tapi prompt minta konten lebih panjang
  - Loading text: ganti "Mencari berita & menyiapkan 10 artikel ${slotLabel().toLowerCase()} ini…" → pesan dinamis dengan fase: "🔍 Mencari berita terkini...", kemudian update ke "✍️ Menyiapkan artikel untukmu..." (2 fase loading dengan `setTimeout`)

**P1.3 — Filter 'Islam & Psikologi' (`news.js`, `index.html`)**
- Tambah kategori `'islam'` ke `CATMAP` (setiap ~5 artikel ke-5, 1 dari 10 artikel bertema Islam & Psikologi)
- Tambah topik Islam-Psikologi ke `TOPICS` array (contoh: `'kesehatan mental perspektif Islam', 'sabar dan resiliensi psikologi', ...`)
- Di `index.html`: tambah tab filter `<button class="ftab" onclick="filterNews('islam',this)">☪️ Islam & Psikologi</button>` setelah tab yang sudah ada
- Di `renderNews()`: filter category `'islam'` sudah handled oleh existing logic

**P1.4 — Badge 'Baru hari ini' + timestamp (`news.js`)**
- Di `renderNews()`, tambahkan badge HTML ke `.ncard-src-row`:
  ```html
  <span class="nbadge-new">Baru hari ini</span>
  ```
- Badge hanya tampil jika artikel di-load hari ini (cek timestamp cache dari `loadNewsCache().savedAt`)
- Tambahkan `savedAt` date ke `artStore` global saat load
- CSS di `styles.css`:
  ```css
  .nbadge-new { font-size:8px; font-weight:800; background:#1db954; color:#fff; padding:1px 5px; border-radius:100px; }
  ```

**P1.5 — Reading progress bar (`news.js`, `styles.css`)**
- Di `openArt()`, setelah set `ov.classList.add('open')`, attach scroll listener ke `.art-scroll`:
  ```js
  const scroll = document.querySelector('.art-scroll');
  const bar    = document.getElementById('art-progress');
  scroll.addEventListener('scroll', () => {
    const pct = (scroll.scrollTop / (scroll.scrollHeight - scroll.clientHeight)) * 100;
    bar.style.width = pct + '%';
  }, { passive: true });
  ```
- Di `index.html` article overlay topbar: tambah `<div id="art-progress" class="art-progress-bar"></div>`
- CSS:
  ```css
  .art-topbar { position: relative; }
  .art-progress-bar { position:absolute; bottom:0; left:0; height:2px; background:var(--g1); width:0; transition:width .1s; }
  ```

**P1.6 — Bookmark artikel (`news.js`, `styles.css`)**
- localStorage key: `moodly_bookmarks` → JSON array of article objects
- Di `openArt(idx)`: tambah bookmark button di topbar:
  ```html
  <button id="art-bm-btn" onclick="window._toggleBookmark(${idx})">🔖</button>
  ```
- `window._toggleBookmark(idx)`: toggle artikel di localStorage, update icon (🔖 / ✅)
- Tambah tab filter "🔖 Tersimpan" di news screen: filter dari localStorage bukan dari `artStore`
- CSS: style tombol bookmark di art-topbar

**Acceptance Criteria P1:**
- Artikel tidak refresh saat pindah screen dalam hari yang sama
- Artikel refresh otomatis di hari baru (midnight test: ubah system clock, reload)
- Tab "Islam & Psikologi" menampilkan artikel bertema Islam
- Reading progress bar bergerak saat scroll artikel
- Bookmark tersimpan setelah reload halaman
- Badge "Baru hari ini" muncul di semua artikel

---

### TASK P2 — Al-Quran 114 Surah

**Complexity:** XL  
**Files:** `public/safeplace.js`, `public/styles.css`, `public/index.html`  
**Dependencies:** none (alquran.cloud API sudah dipakai)

#### Sub-tasks

**P2.1 — Fetch 114 surah + Juz grouping (`safeplace.js`)**
- Tambah konstanta `JUZ_MAP`: array 30 juz, setiap entry berisi `{juz: N, start: {surah, ayah}, end: {surah, ayah}}` — hardcode dari data quran.com standard.
- Tambah state: `let allSurahs = null; let favSurahs = new Set(JSON.parse(localStorage.getItem('moodly_fav_surahs') || '[]'));`
- Fungsi `async fetchAllSurahs()`:
  ```js
  // Fetch dari https://api.alquran.cloud/v1/surah (list semua 114)
  // Cache ke localStorage 'moodly_surahs_meta' (meta ringan, bukan ayat)
  // Return array {number, name, englishName, englishNameTranslation, numberOfAyahs, revelationType}
  ```
- `renderSurahList(surahs, groupBy='juz')`: render kartu surah dengan grouping by juz (accordion per juz) atau flat list
- Ganti `FEATURED_SURAHS` hardcode dengan dynamic render dari `allSurahs`

**P2.2 — Search + Filter Makkiyah/Madaniyah (`safeplace.js`, `styles.css`)**
- Search bar di atas surah list: input `#surah-search` dengan listener `oninput`
- Filter function: `filterSurahs(query, type)` → filter `allSurahs` by name/number contains query AND revelationType matches
- Filter chips: "Semua" | "Makkiyah 🕋" | "Madaniyah 🕌"
- CSS: `.sp-surah-filter-row`, `.sp-filter-chip` classes

**P2.3 — Favorite surah (`safeplace.js`)**
- ❤️ button di setiap surah card dan di dalam surah reader
- Toggle `favSurahs` Set, persist ke `localStorage.setItem('moodly_fav_surahs', JSON.stringify([...favSurahs]))`
- Tab "❤️ Favorit" di filter row, filters `allSurahs` to only favorites

**P2.4 — Reader upgrade: font resize, scroll resume, bookmark ayat (`safeplace.js`, `styles.css`)**
- Font resize: 3 buttons S/M/L di reader topbar. State: `let quranFontSize = localStorage.getItem('moodly_qfont') || 'M'`. Classes `qfont-s` / `qfont-m` / `qfont-l` pada `.surah-ar` (font-size: 18px / 22px / 28px).
- Scroll resume: pada `openSurah(no)`, setelah render, `surahModal.scrollTop = parseInt(localStorage.getItem('moodly_scroll_' + no) || '0')`. On scroll: `localStorage.setItem('moodly_scroll_' + no, surahModal.scrollTop)` (throttled, setiap 500ms).
- Bookmark ayat: long-press atau 🔖 icon per ayah. `localStorage.setItem('moodly_bm_ayah', JSON.stringify({surah: no, ayah: i}))`. Saat reader dibuka, scroll ke bookmark jika ada.

**P2.5 — Audio tilawah (`safeplace.js`, `styles.css`)**
- URL pattern: `https://cdn.islamic.network/quran/audio/128/ar.alafasy/{globalAyahNumber}.mp3`
- `globalAyahNumber` dihitung dari jumlah ayat surah sebelumnya (perlu `ayahOffset` array 114 entries — hardcode karena data statis)
- Per ayat: tombol ▶️ / ⏸️. Satu `Audio` object global, stop previous jika play new.
- State: `let currentAudio = null; let playingAyah = null;`
- Fungsi `playAyah(globalNo, btn)`: `currentAudio?.pause(); currentAudio = new Audio(url); currentAudio.play(); currentAudio.onended = () => btn.textContent = '▶️';`
- CSS: `.ayah-audio-btn` – tombol kecil di kanan teks Arab setiap ayat

**P2.6 — Tambah 14 kajian baru (total 20+) (`safeplace.js`)**
- Tambahkan 14 entri baru ke `KAJIAN_LIST` dengan kategori baru:
  - Kategori baru: 'Keluarga & Silaturahmi', 'Rezeki & Tawakkal', 'Muhasabah', 'Akhlak', 'Produktivitas Islami', 'Doa Spesifik', 'Kisah Nabi', 'Ilmu & Hikmah'
- Konten: teks lengkap, arabic quote, latin, sumber hadits/quran
- Tambah category filter di kajian section: chips filter by category

**P2.7 — Tasbih digital (`safeplace.js`, `styles.css`, `index.html`)**
- Tambah section "📿 Tasbih" di safeplace screen
- State: `let tasbihCount = 0; let tasbihPreset = 33;`
- Presets: Subhanallah (33), Alhamdulillah (33), Allahu Akbar (33) — total 99
- Tombol tap besar (full width, animasi pulse saat tap)
- Haptic feedback: `navigator.vibrate?.(30)` saat tap
- Auto-cycle: saat count mencapai preset, tanda bunyi (jika ada), lanjut ke fase berikutnya
- Simpan harian: `localStorage.setItem('moodly_tasbih_' + todayDate, JSON.stringify({count, phase, completedSets}))`
- CSS: `.sp-tasbih-btn` (ukuran besar, gradient, shadow), `.sp-tasbih-count` (angka besar)

**P2.8 — Doa: dari 8 → 30+ doa (`safeplace.js`)**
- Tambah 22+ doa baru ke `DOA_LIST`, dikategorikan:
  - Kategori: 'Pagi & Malam', 'Aktivitas Harian', 'Ibadah', 'Kesulitan & Perlindungan', 'Keluarga', 'Perjalanan', 'Rezeki', 'Kesehatan'
- Render: ganti grid flat → accordion by kategori (8 kategori, expandable)
- Search doa: input `#doa-search` filter by nama/arti

**Acceptance Criteria P2:**
- Semua 114 surah muncul, grouped by juz
- Search "Al-Fatihah" dan "1" sama-sama menemukan Surah 1
- Filter Makkiyah menampilkan hanya surah Makkiyah
- Favorit tersimpan setelah reload
- Audio play/pause per ayat tanpa crash jika ayat lain ditekan
- Tasbih count tersimpan per hari
- 20+ kajian muncul dengan kategori

---

### TASK P3 — Admin Dashboard v2

**Complexity:** XL  
**Files:** `public/admin.html` (near full rewrite), `public/firebase.js` (tambah read functions untuk admin)  
**Dependencies:** none (admin.html standalone, Firebase direct)

#### Sub-tasks

**P3.1 — Auth (`admin.html`)**
- Saat halaman load: `const pw = prompt('Moodly Admin Password:'); if (pw !== 'moodly2025admin') { document.body.innerHTML = '<p>Access denied</p>'; throw new Error(); }`
- Password hardcoded sementara (spec menyebut: "atau hardcoded sementara")
- Wrap seluruh init logic dalam auth gate

**P3.2 — Global Analytics Tab (`admin.html`)**
- Tab baru: "📊 Analytics" di nav
- Fetch semua users dari Firestore collection `users` (getDocs)
- Kalkulasi:
  - Total user (count)
  - Total check-in (sum semua subcollection `entries`)
  - Distribusi mood: group by `mood.l`, count, render bar chart (HTML/CSS bars)
  - Top causes: aggregate `causes` array dari semua entries
  - Top user by streak: kalkulasi streak dari entries per user
- Render dengan kartu-kartu HTML, tidak pakai chart library (pakai CSS bars seperti di insight screen)

**P3.3 — Search + Filter + Sort user list (`admin.html`)**
- Di sidebar: tambah `<input id="user-search" placeholder="Cari nama...">` dengan debounce 300ms
- Sort dropdown: "Terbaru" | "Nama A-Z" | "Streak tertinggi" | "Paling aktif"
- Filter chips: "Semua" | "Aktif hari ini" | "Tidak aktif 7+ hari"
- JavaScript: filter `allUsers` array berdasarkan kriteria, re-render sidebar

**P3.4 — User Detail Tabs: Mood | Siklus | Raw Data (`admin.html`)**
- Saat klik user di sidebar, tampilkan panel kanan dengan 3 tabs
- **Tab Mood**: 
  - Mini bar chart 7 hari terakhir (emoji mood per hari)
  - Streak hitung dari entries
  - Daftar entries 10 terbaru
- **Tab Siklus**: 
  - Data dari subcollection `periods`
  - List periode dengan start date, durasi, fase saat ini
- **Tab Raw Data**: 
  - JSON viewer sederhana: `<pre>${JSON.stringify(userData, null, 2)}</pre>`
  - Tombol copy JSON ke clipboard

**P3.5 — Export user data (`admin.html`)**
- Tombol "⬇️ Export JSON": `JSON.stringify(userData)` → Blob → download link
- Tombol "⬇️ Export CSV": manual CSV generation dari entries array
  - Header: `ts,mood,intensity,causes,note,cyclePhase`
  - Rows: entries data
  - `Blob([csvStr], {type:'text/csv'})` → download

**P3.6 — Article Cache Manager (`admin.html`)**
- Tab baru "📰 Cache Artikel" di nav
- Fetch dari Firestore: query semua documents `users/*/cache/news` (collection group query)
- Render table: deviceId | key (date) | artikel count | savedAt timestamp
- Tombol "Invalidate All": loop semua cache docs, `setDoc(ref, {key:'__invalidated__', arts:[]})`
- Tombol "Invalidate" per baris

**P3.7 — Nav & Layout fix (`admin.html`)**
- Current layout: sidebar + main panel (desktop only)
- Tambah tab nav di top bar: "👥 Users" | "📊 Analytics" | "📰 Cache" 
- Tab switching: hide/show main panel sections

**Acceptance Criteria P3:**
- Halaman tidak tampil tanpa password benar
- Analytics tab menampilkan total users dan distribusi mood
- Search user berfungsi real-time
- Export JSON menghasilkan file yang bisa dibuka di text editor
- Cache invalidate membuat app user refresh artikel di kunjungan berikutnya

---

### TASK P4 — Design System & Polish

**Complexity:** M  
**Files:** `public/styles.css`, `public/index.html`, `public/app.js`  
**Dependencies:** P1 dan P2 harus selesai (agar HTML structure stable)

#### Sub-tasks

**P4.1 — Typography scale & spacing system (`styles.css`)**
- Tambah CSS custom properties di `:root`:
  ```css
  --fs-xs: 9px;  --fs-sm: 11px; --fs-md: 13px; --fs-lg: 15px;
  --fs-xl: 19px; --fs-2xl: 22px; --fs-3xl: 25px;
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px; --sp-5: 20px;
  ```
- Apply ke komponen yang saat ini hardcode nilai (tidak breaking — hanya refactor value ke variable)
- Pastikan tidak ada regresi visual di semua 6 screens

**P4.2 — Animasi entrance cards (`styles.css`)**
- Keyframe `@keyframes fadeSlideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }`
- Class `.card-enter { animation: fadeSlideUp .35s cubic-bezier(.22,1,.36,1) both; }`
- Apply staggered delay ke kartu di home screen (`.scard:nth-child(1){animation-delay:.05s}` dll)
- Apply ke news cards saat `renderNews()` inject HTML: tambahkan class `card-enter` ke `.ncard`

**P4.3 — Hero animasi & stats count-up (`app.js`, `styles.css`)**
- Hero section: tambah subtle animated gradient shimmer on load
  ```css
  @keyframes hero-shimmer { 0%{background-position:0% 50%} 100%{background-position:100% 50%} }
  ```
- Stats count-up: fungsi `countUp(el, target, duration)` yang animates number dari 0 ke target dalam `duration`ms menggunakan `requestAnimationFrame`
- Apply ke `.scard-val` elements saat screen `home` di-show (dalam `showScreen('home')` di `app.js`)

**P4.4 — Cycle: gradient phase card + pulse hari ini (`styles.css`, `cycle.js`)**
- `.phase-card` sudah punya gradient per fase — tambah animasi masuk:
  ```css
  .phase-card { animation: fadeSlideUp .4s cubic-bezier(.22,1,.36,1); }
  ```
- Hari ini di cycle strip: `.cd.today-d` tambah CSS:
  ```css
  .cd.today-d::after { content:''; position:absolute; inset:-3px; border-radius:13px; border:2px solid var(--g1); animation: pulse-ring 2s ease-out infinite; }
  @keyframes pulse-ring { 0%{opacity:.7;transform:scale(1)} 100%{opacity:0;transform:scale(1.25)} }
  ```

**P4.5 — Prayer times countdown real-time (`safeplace.js`)**
- Saat `renderPrayerTimes()` selesai: `setInterval(updateCountdown, 60000)` yang hanya update elemen `.sp-next-countdown` tanpa re-render seluruh kartu
- Fungsi `updateCountdown()` rekalk `minutesLeft` dari `nextPrayer.minutes - nowMinutes` dan update textContent

**Acceptance Criteria P4:**
- Cards animate on first load tanpa jank di low-end device
- Stats counter animates dari 0 ke angka aktual
- Cycle strip today indicator has pulsing ring
- Prayer countdown updates setiap menit tanpa flicker

---

### TASK P5 — Doa & Kajian Enhancement

**Complexity:** M  
**Files:** `public/safeplace.js`, `api/anthropic.js`  
**Dependencies:** P1 (Anthropic proxy confirmed working), P2 (doa expansion sudah di P2.8 — P5 ini khusus Kajian AI dinamis)

#### Sub-tasks

**P5.1 — Kajian AI dinamis: 1 kajian baru per hari via Claude (`safeplace.js`, `api/anthropic.js`)**
- Cache key: `moodly_kajian_ai_${YYYY-MM-DD}` di localStorage (dan opsional Firebase)
- Saat `initSafePlace()`: cek cache. Jika belum ada hari ini, fetch dari Claude.
- Prompt Claude:
  ```
  Kamu adalah ustaz/ustazah yang menulis kajian harian untuk aplikasi kesehatan mental Muslim Indonesia.
  Tanggal: ${todayDate}. Tulis SATU kajian islami yang relevan dengan kesehatan mental hari ini.
  Topik bisa dari: kesabaran, tawakal, syukur, ikhtiar, muhasabah, silaturahmi, kejujuran, dll.
  Sertakan: ayat Al-Quran atau hadis shahih sebagai landasan, penjelasan psikologis ringan, dan langkah praktis.
  Return ONLY JSON: {"emoji":"<1 emoji>","category":"<kategori>","title":"<max 8 kata>","content":"<teks 200-300 kata, paragraph pendek>","source":"<nama sumber hadits/quran>","readTime":"<X menit>"}
  ```
- Model: `claude-haiku-4-20250514` (bukan sonnet — lebih hemat untuk task sederhana ini)
- Tambah "✨ Kajian Hari Ini" section di atas `KAJIAN_LIST` render, dengan badge "Baru"
- Error handling: jika fetch gagal, skip section (jangan block render kajian statis)

**Acceptance Criteria P5:**
- Kajian AI berbeda setiap hari
- Jika offline/API gagal, kajian statis tetap tampil normal
- Kajian AI muncul di posisi teratas, diberi badge "✨ Hari Ini"

---

## Risk Register

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|-------------|--------|----------|
| Groq rate limit di production | Tinggi | Tinggi | **P0 fallback model** menyelesaikan ini |
| alquran.cloud API down | Medium | Medium | Cache agresif ke localStorage setelah first load per surah; graceful error state |
| Claude API cost melonjak (P1 + P5 tiap hari) | Medium | Medium | P1 cache 1x/hari (bukan 4x) mengurangi call 75%. P5 pakai claude-haiku. Monitor via Anthropic dashboard |
| Firebase quota (admin P3 mass read) | Medium | Low | Admin hanya diakses oleh 1 orang, bukan user publik. Pagination per user jika perlu |
| `admin.html` password hardcoded terekspos di git | Tinggi | Medium | Dokumentasikan untuk segera diganti ke env var. Tidak di-commit ke public repo |
| alquran audio CDN rate limit | Low | Low | Single `Audio` object, one at a time, tidak pre-load |
| Mobile performance (P2 render 114 surah) | Medium | Medium | Virtual scroll atau lazy render per juz (hanya render juz yang di-expand) |
| Breaking change: `slotKey` → `todayKey` (P1) | Low | Medium | Cache invalidation sudah eksplisit (`__invalidated__`), migrasi otomatis pada hari pertama deploy |

---

## File Change Matrix

| File | P0 | P1 | P2 | P3 | P4 | P5 |
|------|----|----|----|----|----|----|
| `api/chat.js` | ✏️ | — | — | — | — | — |
| `api/anthropic.js` | — | — | — | — | — | ✏️ kecil |
| `public/chat.js` | ✏️ | — | — | — | — | — |
| `public/news.js` | — | ✏️ | — | — | — | — |
| `public/safeplace.js` | — | — | ✏️ besar | — | ✏️ (P4.5) | ✏️ (P5.1) |
| `public/firebase.js` | — | — | — | ✏️ kecil | — | — |
| `public/app.js` | — | — | — | — | ✏️ (P4.3) | — |
| `public/styles.css` | — | ✏️ (P1.4-6) | ✏️ (P2.2-8) | — | ✏️ besar | — |
| `public/index.html` | — | ✏️ (P1.3,5) | ✏️ (P2.7) | — | — | — |
| `public/admin.html` | — | — | — | ✏️ rewrite | — | — |

**Skala:** ✏️ = modifikasi, ✏️ besar = substantial rewrite, ✏️ kecil = 1-5 lines, — = tidak disentuh

---

## Catatan Implementasi Kritis

1. **Vercel tidak perlu disentuh.** `vercel.json` sudah benar — routes ke `/api/chat`, `/api/anthropic`, `/admin`, dll semua sudah ter-handle.

2. **Firebase struktur tidak berubah.** Skema existing (`users/{deviceId}/entries`, `users/{deviceId}/cache/news`, dll) cukup untuk semua fitur baru. Hanya P3 yang perlu fungsi baca baru untuk admin.

3. **Module system: Vanilla ES Modules.** `import`/`export` sudah dipakai di seluruh codebase. Tidak ada bundler. Semua tambahan harus mengikuti pattern ini.

4. **`window._xxx` pattern.** Banyak fungsi di-expose via `window._openSurah`, `window._openArt`, dll karena HTML inline event handlers tidak bisa akses ES module scope langsung. Lanjutkan pattern ini.

5. **No test framework.** Project tidak memiliki test runner. Verifikasi manual via browser dev tools dan Vercel preview deployment.

6. **`public/firebase.js` Firebase API key** ada di plaintext — ini intentional (Firebase client SDK key adalah public, security via Firestore Rules). Jangan encrypt atau pindahkan.

7. **Admin password di P3:** Spec menyebut "hardcoded sementara". Implementasi: `const ADMIN_PW = 'moodly2025admin'` di top of admin.html `<script>`. Sertakan komentar `// TODO: ganti ke env-based auth`.

---

## Urutan Deploy yang Optimal

```
Hari 1: P0 (deploy segera — AI chat broken)
Hari 2: P1 (artikel harian — quick win, user-visible)
Hari 3-4: P2 (Al-Quran 114 — paling banyak kode)
Hari 5: P3 (Admin — independent, internal tool)
Hari 6: P4 + P5 (polish + kajian AI — kosmetik + nice-to-have)
```

Setiap task bisa di-deploy independent karena tidak ada runtime dependency antar task di client side.
