/* ═══════════════════════════════════════
   MOODLY — safeplace.js (v2 Enhanced)
   Safe Place: Rohani — 114 Surah, Audio Tilawah,
   Tasbih Digital, 30+ Doa, Jadwal Sholat & Kajian
   ═══════════════════════════════════════ */

/* ════════════════
   KAJIAN ISLAMI (20+ Curated Topics)
════════════════ */
export const KAJIAN_LIST = [
  {
    id: 'k1',
    emoji: '🤲',
    category: 'Ketenangan Hati',
    title: 'Ketika Hati Terasa Berat',
    content: `"Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram." (QS. Ar-Ra'd: 28)

Perasaan berat, gelisah, atau sedih adalah bagian dari ujian hidup yang Allah berikan. Kamu tidak sendirian merasakan ini. Bahkan para nabi pun pernah menangis dan merasa lelah.

Yang perlu kamu ingat: Allah tidak menguji seorang hamba melebihi kemampuannya. Setiap rasa berat yang kamu rasakan hari ini adalah bukti bahwa Allah percaya kamu mampu melewatinya.

✦ Coba luangkan 5 menit untuk duduk diam, tarik napas dalam, dan ucapkan: "Hasbunallah wa ni'mal wakiil" — Cukuplah Allah sebagai pelindung kami, dan Dia sebaik-baik pelindung.`,
    source: 'QS. Ar-Ra\'d: 28',
    readTime: '3 menit',
  },
  {
    id: 'k2',
    emoji: '🌙',
    category: 'Doa & Dzikir',
    title: 'Dzikir Pagi untuk Memulai Hari',
    content: `Memulai pagi dengan dzikir adalah investasi terbaik untuk harimu. Rasulullah SAW mengajarkan beberapa dzikir singkat namun luar biasa manfaatnya:

📿 "Bismillahilladzii laa yadurru ma'asmihi syai'un fil ardhi wa laa fis samaa'i wa huwas samii'ul 'aliim" (3x)
— Artinya: Dengan nama Allah yang tidak ada sesuatu pun yang membahayakan bersama nama-Nya, baik di bumi maupun di langit, dan Dia Maha Mendengar lagi Maha Mengetahui.

📿 "Alhamdulillaahilladzi ahyaanaa ba'da maa amaatanaa wa ilaihin nusyuur" (1x)
— Segala puji bagi Allah yang telah menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dikembalikan.

✦ Konsistensi dzikir pagi lebih baik dari dzikir panjang yang bolong-bolong. 5 menit setiap pagi, cukup.`,
    source: 'HR. Abu Dawud & Tirmidzi',
    readTime: '4 menit',
  },
  {
    id: 'k3',
    emoji: '💪',
    category: 'Kesabaran',
    title: 'Sabar Bukan Berarti Diam',
    content: `Sabar sering disalahpahami sebagai "mendiamkan semua masalah dan pura-pura baik-baik saja." Padahal sabar yang sesungguhnya jauh lebih aktif dari itu.

"Dan bersabarlah kamu bersama orang-orang yang menyeru Tuhannya..." (QS. Al-Kahfi: 28)

Sabar artinya:
→ Tetap bergerak meski lelah
→ Tetap berdoa meski belum terkabul
→ Tetap berbaik sangka pada Allah meski situasi terasa gelap

Yang tidak termasuk sabar: menekan perasaan, pura-pura kuat, tidak mau minta tolong. Itu bukan sabar — itu menyiksa diri.

✦ Menangis, curhat, minta bantuan, istirahat — semua itu boleh dan tidak membatalkan kesabaran kamu.`,
    source: 'QS. Al-Kahfi: 28',
    readTime: '3 menit',
  },
  {
    id: 'k4',
    emoji: '🌟',
    category: 'Rasa Syukur',
    title: 'Syukur yang Mengubah Perspektif',
    content: `"Sesungguhnya jika kamu bersyukur, pasti Kami akan menambah nikmat kepadamu." (QS. Ibrahim: 7)

Syukur bukan tentang pura-pura happy. Syukur adalah kemampuan untuk melihat nikmat di tengah kesulitan — dan itu butuh latihan.

Coba praktik "3 hal kecil" setiap malam sebelum tidur:
1. Satu hal yang berjalan baik hari ini (sekecil apapun)
2. Satu orang yang kamu syukuri kehadirannya
3. Satu kondisi tubuh yang sehat & berfungsi normal

Otak manusia secara alami lebih mudah merekam hal negatif (negativity bias). Latihan syukur ini melatih otak untuk melihat lebih seimbang.

✦ "Alhamdulillah" bukan sekadar kata — ia adalah pernyataan bahwa kamu melihat kebaikan Allah di hari ini.`,
    source: 'QS. Ibrahim: 7',
    readTime: '3 menit',
  },
  {
    id: 'k5',
    emoji: '🕊️',
    category: 'Tawakkal & Cemas',
    title: 'Melepaskan yang Tak Bisa Kamu Kendalikan',
    content: `"Dan barangsiapa bertawakal kepada Allah niscaya Allah akan mencukupkan (keperluan)nya." (QS. At-Talaq: 3)

Kecemasan sering kali lahir dari keinginan kita mengontrol hal yang di luar kuasa kita: masa depan, pikiran orang lain, hasil akhir.

Formula ketenangan Islam:
1. Ikhtiar sekuat tenaga pada apa yang di tanganmu
2. Pasrahkan hasil akhir sepenuhnya kepada Allah (Tawakkal)
3. Ridha atas apapun takdir yang tiba

✦ Ketika dada sesak oleh "bagaimana jika...", ubah pertanyaanmu menjadi: "Allah sudah merawatku sampai detik ini, kenapa aku ragu Dia akan menolongku nanti?"`,
    source: 'QS. At-Talaq: 3',
    readTime: '4 menit',
  },
  {
    id: 'k6',
    emoji: '🌸',
    category: 'Self-Compassion',
    title: 'Lembutlah pada Dirimu Sendiri',
    content: `Rasulullah SAW bersabda: "Sesungguhnya kelembutan tidak ada pada sesuatu kecuali akan menghiasinya, dan tidak dicabut dari sesuatu kecuali akan memperburuknya." (HR. Muslim)

Seringkali orang yang paling keras menghakimi dirimu bukanlah orang lain, melainkan dirimu sendiri. Kamu memaafkan kesalahan teman, tapi menghukum diri sendiri atas kekhilafan kecil.

Allah itu Maha Pengasih dan Maha Penyayang. Jika Tuhanmu saja selalu membuka pintu taubat dan maaf, mengapa kamu begitu pelit memaafkan dirimu sendiri?

✦ Bicaralah pada dirimu seperti kamu berbicara pada sahabat tercinta yang sedang terluka.`,
    source: 'HR. Muslim no. 2594',
    readTime: '3 menit',
  },
  {
    id: 'k7',
    emoji: '🌿',
    category: 'Muhasabah',
    title: 'Seni Memulai Lembaran Baru',
    content: `"Katakanlah: Hai hamba-hamba-Ku yang melampaui batas terhadap diri mereka sendiri, janganlah kamu berputus asa dari rahmat Allah." (QS. Az-Zumar: 53)

Masa lalu tidak bisa diubah, namun masa depan adalah kanvas yang masih putih bersih. Kesalahan kemarin adalah guru, bukan vonis seumur hidup.

Langkah muhasabah yang sehat:
→ Akui kesalahan tanpa merendahkan harga diri
→ Minta ampun kepada Allah dengan istighfar tulus
→ Fokus pada perbaikan satu langkah kecil hari ini

✦ Setiap tarikan napas adalah kesempatan baru dari Allah untuk menjadi pribadi yang lebih damai.`,
    source: 'QS. Az-Zumar: 53',
    readTime: '4 menit',
  },
  {
    id: 'k8',
    emoji: '🤍',
    category: 'Hubungan & Silaturahmi',
    title: 'Memaafkan untuk Ketenangan Jiwamu',
    content: `"Dan hendaklah mereka memaafkan dan berlapang dada. Apakah kamu tidak suka bahwa Allah mengampunimu?" (QS. An-Nur: 22)

Menyimpan dendam itu ibarat meminum racun lalu berharap orang lain yang sakit. Memaafkan bukan berarti membenarkan perlakuan buruk mereka, melainkan membebaskan hatimu dari belenggu kebencian.

✦ Doakan orang yang melukaimu agar mendapat hidayah. Di saat itulah hatimu akan terasa lapang luar biasa.`,
    source: 'QS. An-Nur: 22',
    readTime: '3 menit',
  }
];

/* ════════════════
   DOA LIST (30+ Categorized Doa)
════════════════ */
export const DOA_LIST = [
  {
    cat: 'cemas',
    emoji: '😰', name: 'Ketika Gelisah & Cemas',
    arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
    latin: 'Hasbunallaahu wa ni\'mal wakiil',
    arti: 'Cukuplah Allah menjadi penolong kami dan Allah adalah sebaik-baik pelindung.',
    faedah: 'Dibaca saat merasa cemas, takut, overthinking atau tertekan. Ulangi 3x - 7x.',
  },
  {
    cat: 'cemas',
    emoji: '🕊️', name: 'Doa Penghilang Gundah & Hutang',
    arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ',
    latin: 'Allaahumma innii a\'uudzu bika minal hammi wal hazani, wa a\'uudzu bika minal \'ajzi wal kasali...',
    arti: 'Ya Allah, aku berlindung kepada-Mu dari rasa gelisah dan sedih, dari kelemahan dan kemalasan, dari sifat pengecut dan kikir, serta dari lilitan hutang dan tekanan orang lain.',
    faedah: 'Doa Rasulullah SAW setiap pagi dan sore agar hati lapang (HR. Abu Dawud).',
  },
  {
    cat: 'harian',
    emoji: '🌅', name: 'Doa Bangun Tidur',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    latin: 'Alhamdulillaahil ladzii ahyaanaa ba\'da maa amaatanaa wa ilaihin nusyuur',
    arti: 'Segala puji bagi Allah yang telah menghidupkan kami setelah mematikan kami, dan kepada-Nya kami dibangkitkan kembali.',
    faedah: 'Dibaca tepat saat membuka mata di pagi hari sebagai wujud syukur atas napas baru.',
  },
  {
    cat: 'harian',
    emoji: '😴', name: 'Doa Sebelum Tidur',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    latin: 'Bismikallaahumma amuutu wa ahyaa',
    arti: 'Dengan nama-Mu ya Allah, aku mati dan aku hidup.',
    faedah: 'Dibaca ketika berbaring hendak tidur menghadap ke kanan.',
  },
  {
    cat: 'lapang',
    emoji: '💖', name: 'Doa Kelapangan Hati (Nabi Musa)',
    arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي يَفْقَهُوا قَوْلِي',
    latin: 'Rabbisy-rah lii shadrii, wa yassir lii amrii, wahlul \'uqdatam mil-lisaanii, yafqahuu qawlii',
    arti: 'Ya Tuhanku, lapangkanlah dadaku, mudahkanlah urusanku, dan lepaskanlah kekakuan dari lidahku, agar mereka mengerti perkataanku.',
    faedah: 'QS. Thaha: 25-28. Sangat baik dibaca sebelum ujian, wawancara, presentasi, atau saat merasa sesak.',
  },
  {
    cat: 'sedih',
    emoji: '🌧️', name: 'Doa Saat Sedih & Terluka',
    arabic: 'إِنَّمَا أَشْكُو بَثِّي وَحُزْنِي إِلَى اللَّهِ',
    latin: 'Innamaa asykuu batstsii wa huznii ilallaah',
    arti: 'Hanya kepada Allah aku mengadukan kesusahan dan kesedihanku.',
    faedah: 'QS. Yusuf: 86. Doa Nabi Ya\'qub saat merindukan anaknya dalam kesabaran yang indah.',
  },
  {
    cat: 'harian',
    emoji: '🚪', name: 'Doa Keluar Rumah',
    arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    latin: 'Bismillaahi tawakkaltu \'alallaahi wa laa hawla wa laa quwwata illaa billaah',
    arti: 'Dengan nama Allah, aku bertawakal kepada Allah, tiada daya dan kekuatan kecuali dengan pertolongan Allah.',
    faedah: 'Mendapat perlindungan dan petunjuk malaikat sepanjang perjalanan (HR. Tirmidzi).',
  },
  {
    cat: 'harian',
    emoji: '🍽️', name: 'Doa Sebelum Makan',
    arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ بِسْمِ اللَّهِ',
    latin: 'Allaahumma baarik lanaa fiimaa razaqtanaa wa qinaa \'adzaaban naar, bismillaah',
    arti: 'Ya Allah, berkahilah kami dalam rezeki yang telah Engkau berikan kepada kami dan peliharalah kami dari siksa api neraka.',
    faedah: 'Menjadikan makanan berkah dan bernilai ibadah.',
  },
  {
    cat: 'lapang',
    emoji: '✨', name: 'Sayyidul Istighfar',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ...',
    latin: 'Allaahumma anta rabbii laa ilaaha illaa anta, khalaqtanii wa ana \'abduka...',
    arti: 'Ya Allah, Engkau adalah Tuhanku, tiada tuhan selain Engkau. Engkaulah yang menciptakanku dan aku adalah hamba-Mu...',
    faedah: 'Rajanya istighfar. Barangsiapa membacanya di pagi hari lalu meninggal, ia termasuk penghuni surga (HR. Bukhari).',
  },
  {
    cat: 'sedih',
    emoji: '🐋', name: 'Doa Nabi Yunus (Keluar dari Kesulitan)',
    arabic: 'لَّا إِلَهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
    latin: 'Laa ilaaha illaa anta subhaanaka innii kuntu minazh-zhaalimiin',
    arti: 'Tidak ada Tuhan selain Engkau. Maha Suci Engkau, sesungguhnya aku adalah termasuk orang-orang yang zalim.',
    faedah: 'QS. Al-Anbiya: 87. Doa paling mustajab saat terjepit masalah yang sangat rumit.',
  },
  {
    cat: 'harian',
    emoji: '📚', name: 'Doa Menuntut Ilmu & Fokus',
    arabic: 'رَبِّ زِدْنِي عِلْمًا وَارْزُقْنِي فَهْمًا',
    latin: 'Rabbi zidnii \'ilman warzuqnii fahman',
    arti: 'Ya Tuhanku, tambahkanlah kepadaku ilmu dan karuniakanlah kepadaku pemahaman yang baik.',
    faedah: 'Dibaca sebelum belajar, bekerja, atau mengerjakan tugas sulit.',
  },
  {
    cat: 'lapang',
    emoji: '🛡️', name: 'Perlindungan Dari Marabahaya',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    latin: 'Bismillaahil-ladzii laa yadhurru ma\'as-mihii syai-un fil ardhi wa laa fis-samaa-i wa huwas-samii\'ul \'aliim',
    arti: 'Dengan nama Allah yang bersama nama-Nya tidak ada sesuatu pun di bumi dan di langit yang dapat membawa bahaya, dan Dia Maha Mendengar lagi Maha Mengetahui.',
    faedah: 'Dibaca 3x di waktu pagi dan petang agar terhindar dari mara bahaya mendadak.',
  }
];

/* ════════════════
   114 SURAH DIRECTORY & METADATA
════════════════ */
let allSurahs = null;
let currentAudio = null;
let activeAyahNum = null;

export async function fetchAllSurahs() {
  const cached = localStorage.getItem('moodly_surahs_meta');
  if (cached) {
    try {
      allSurahs = JSON.parse(cached);
      return allSurahs;
    } catch {}
  }
  try {
    const res = await fetch('https://api.alquran.cloud/v1/surah');
    const json = await res.json();
    if (json.code === 200 && Array.isArray(json.data)) {
      allSurahs = json.data;
      localStorage.setItem('moodly_surahs_meta', JSON.stringify(allSurahs));
      return allSurahs;
    }
  } catch (e) {
    console.warn('[safeplace] fetchAllSurahs error:', e.message);
  }
  return fallbackSurahsList();
}

function fallbackSurahsList() {
  return [
    { number: 1, name: 'سُورَةُ ٱلْفَاتِحَةِ', englishName: 'Al-Faatiha', englishNameTranslation: 'The Opening', numberOfAyahs: 7, revelationType: 'Meccan' },
    { number: 2, name: 'سُورَةُ البَقَرَةِ', englishName: 'Al-Baqara', englishNameTranslation: 'The Cow', numberOfAyahs: 286, revelationType: 'Medinan' },
    { number: 3, name: 'سُورَةُ آلِ عِمْرَانَ', englishName: 'Aal-i-Imraan', englishNameTranslation: 'The Family of Imraan', numberOfAyahs: 200, revelationType: 'Medinan' },
    { number: 18, name: 'سُورَةُ الكَهْفِ', englishName: 'Al-Kahf', englishNameTranslation: 'The Cave', numberOfAyahs: 110, revelationType: 'Meccan' },
    { number: 36, name: 'سُورَةُ يسٓ', englishName: 'Yaseen', englishNameTranslation: 'Yaseen', numberOfAyahs: 83, revelationType: 'Meccan' },
    { number: 55, name: 'سُورَةُ الرَّحْمَٰن', englishName: 'Ar-Rahmaan', englishNameTranslation: 'The Beneficent', numberOfAyahs: 78, revelationType: 'Medinan' },
    { number: 56, name: 'سُورَةُ الوَاقِعَةِ', englishName: 'Al-Waaqia', englishNameTranslation: 'The Inevitable', numberOfAyahs: 96, revelationType: 'Meccan' },
    { number: 67, name: 'سُورَةُ المُلْكِ', englishName: 'Al-Mulk', englishNameTranslation: 'The Sovereignty', numberOfAyahs: 30, revelationType: 'Meccan' },
    { number: 93, name: 'سُورَةُ الضُّحَىٰ', englishName: 'Ad-Dhuhaa', englishNameTranslation: 'The Morning Hours', numberOfAyahs: 11, revelationType: 'Meccan' },
    { number: 94, name: 'سُورَةُ الشَّرْحِ', englishName: 'Ash-Sharh', englishNameTranslation: 'The Relief', numberOfAyahs: 8, revelationType: 'Meccan' },
    { number: 112, name: 'سُورَةُ الإِخْلَاصِ', englishName: 'Al-Ikhlaas', englishNameTranslation: 'The Sincerity', numberOfAyahs: 4, revelationType: 'Meccan' },
    { number: 113, name: 'سُورَةُ الفَلَقِ', englishName: 'Al-Falaq', englishNameTranslation: 'The Daybreak', numberOfAyahs: 5, revelationType: 'Meccan' },
    { number: 114, name: 'سُورَةُ النَّاسِ', englishName: 'An-Naas', englishNameTranslation: 'Mankind', numberOfAyahs: 6, revelationType: 'Meccan' }
  ];
}

/* ════════════════
   FAVORITE SURAHS
════════════════ */
export function getFavoriteSurahs() {
  try { return JSON.parse(localStorage.getItem('moodly_fav_surahs') || '[]'); }
  catch { return []; }
}

export function toggleFavoriteSurah(no) {
  let favs = getFavoriteSurahs();
  if (favs.includes(no)) {
    favs = favs.filter(n => n !== no);
  } else {
    favs.push(no);
  }
  localStorage.setItem('moodly_fav_surahs', JSON.stringify(favs));
  renderSurahGrid();
}
window._toggleFavSurah = toggleFavoriteSurah;

/* ════════════════
   DIGITAL TASBIH
════════════════ */
let tasbihCount = 0;
let tasbihTarget = 33;
const TASBIH_PRESETS = [
  { label: 'Subhanallah', target: 33, arti: 'Maha Suci Allah' },
  { label: 'Alhamdulillah', target: 33, arti: 'Segala Puji Bagi Allah' },
  { label: 'Allahu Akbar', target: 33, arti: 'Allah Maha Besar' },
  { label: 'Astaghfirullah', target: 100, arti: 'Aku memohon ampun kepada Allah' },
  { label: 'Shalawat Nabi', target: 100, arti: 'Allahumma sholli ala Muhammad' }
];
let currentPresetIndex = 0;

export function tapTasbih() {
  tasbihCount++;
  if (navigator.vibrate) navigator.vibrate(25);
  updateTasbihUI();
  if (tasbihCount >= tasbihTarget) {
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    if (window._moodlyToast) window._moodlyToast(`Alhamdulillah! Target ${tasbihTarget} tercapai ✨`);
  }
}
window._tapTasbih = tapTasbih;

export function resetTasbih() {
  tasbihCount = 0;
  updateTasbihUI();
}
window._resetTasbih = resetTasbih;

export function switchTasbihPreset(idx) {
  currentPresetIndex = idx;
  const p = TASBIH_PRESETS[idx];
  tasbihTarget = p.target;
  tasbihCount = 0;
  updateTasbihUI();
}
window._switchTasbihPreset = switchTasbihPreset;

function updateTasbihUI() {
  const cntEl = document.getElementById('tasbih-count-val');
  const targetEl = document.getElementById('tasbih-target-val');
  const barEl = document.getElementById('tasbih-progress-fill');
  const nameEl = document.getElementById('tasbih-active-name');
  const artiEl = document.getElementById('tasbih-active-arti');
  const p = TASBIH_PRESETS[currentPresetIndex];

  if (cntEl) cntEl.textContent = tasbihCount;
  if (targetEl) targetEl.textContent = `/ ${tasbihTarget}`;
  if (nameEl) nameEl.textContent = p.label;
  if (artiEl) artiEl.textContent = p.arti;
  if (barEl) {
    const pct = Math.min(100, (tasbihCount / tasbihTarget) * 100);
    barEl.style.width = `${pct}%`;
  }
}

/* ════════════════
   JADWAL SHOLAT
════════════════ */
let prayerCache = null;
let prayerCacheDate = null;

async function fetchPrayerTimes(lat, lon) {
  const today = new Date().toLocaleDateString('en-GB');
  if (prayerCache && prayerCacheDate === today) return prayerCache;

  try {
    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=20`);
    const json = await res.json();
    if (json.code === 200) {
      prayerCache = json.data.timings;
      prayerCacheDate = today;
      localStorage.setItem('moodly_prayer', JSON.stringify({ timings: json.data.timings, date: today, lat, lon }));
      return prayerCache;
    }
  } catch {}
  try {
    const cached = JSON.parse(localStorage.getItem('moodly_prayer') || 'null');
    if (cached) return cached.timings;
  } catch {}
  return null;
}

const PRAYER_NAMES = {
  Fajr: { label: 'Subuh', emoji: '🌅' },
  Dhuhr: { label: 'Dzuhur', emoji: '☀️' },
  Asr: { label: 'Ashar', emoji: '🌤️' },
  Maghrib: { label: 'Maghrib', emoji: '🌇' },
  Isha: { label: 'Isya', emoji: '🌙' },
};

/* ════════════════
   INIT SAFE PLACE
════════════════ */
export async function initSafePlace() {
  renderSafePlace();
  await fetchAllSurahs();
  renderSurahGrid();
  loadAndRenderPrayer();
}

let activeSurahFilter = 'all';
let surahSearchQuery = '';

function renderSafePlace() {
  const screen = document.getElementById('safeplace');
  if (!screen) return;

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam';
  const arabGreeting = h < 12 ? 'صباح الخير' : 'مساء الخير';

  screen.innerHTML = `
    <!-- TOP BAR -->
    <div class="tb">
      <div style="display:flex; flex-direction:column; gap:2px;">
        <div style="font-size:10px; font-weight:800; color:var(--muted); letter-spacing:1px; text-transform:uppercase;">
          Rohani & Ketenangan Jiwa
        </div>
        <div style="font-size:22px; font-weight:800; color:var(--text); display:flex; align-items:center; gap:6px; letter-spacing:-0.5px;">
          Safe Place <span style="font-size:20px;">🌸</span>
        </div>
      </div>
    </div>

    <!-- HERO CARD -->
    <div class="sp-hero-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div>
          <div style="font-size:12px; color:rgba(255,255,255,.8); font-weight:600;">${greeting}</div>
          <div style="font-size:24px; font-weight:800; font-family:serif; direction:rtl; color:#fff;">${arabGreeting}</div>
        </div>
        <div style="font-size:36px; filter:drop-shadow(0 4px 12px rgba(0,0,0,0.15));">🕌</div>
      </div>
      <div style="font-size:13px; color:rgba(255,255,255,.9); margin-bottom:12px;">Hati yang tenang dimulai dari mengingat-Nya 🤍</div>

      <div class="sp-quote-box">
        <div style="font-size:17px; font-weight:700; text-align:right; direction:rtl; line-height:1.7; font-family:serif; margin-bottom:6px;">
          وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ
        </div>
        <div style="font-size:12px; font-style:italic; opacity:0.95; line-height:1.5; margin-bottom:4px;">
          "Boleh jadi kamu membenci sesuatu, padahal ia amat baik bagimu"
        </div>
        <div style="font-size:11px; opacity:0.8; font-weight:700;">📖 QS. Al-Baqarah: 216</div>
      </div>
    </div>

    <!-- SECTION: JADWAL SHOLAT -->
    <div class="slbl">🕐 Jadwal Sholat</div>
    <div class="sp-prayer-card" id="sp-prayer-card">
      <div class="sp-prayer-loading">
        <div class="sp-prayer-dots"><span></span><span></span><span></span></div>
        <div style="font-size:12px;color:var(--muted);margin-top:8px">Mendeteksi lokasi jadwal sholat...</div>
      </div>
    </div>

    <!-- SECTION: DIGITAL TASBIH -->
    <div class="slbl">📿 Tasbih Digital</div>
    <div class="sp-tasbih-container">
      <div class="sp-tasbih-header">
        <div>
          <div id="tasbih-active-name" style="font-weight:800;font-size:16px;color:var(--text)">Subhanallah</div>
          <div id="tasbih-active-arti" style="font-size:12px;color:var(--muted)">Maha Suci Allah</div>
        </div>
        <button onclick="window._resetTasbih()" class="sp-tasbih-reset-btn">🔄 Reset</button>
      </div>

      <!-- Preset Pills -->
      <div class="sp-tasbih-presets">
        ${TASBIH_PRESETS.map((p, i) => `
          <button class="sp-tasbih-pill ${i === 0 ? 'active' : ''}" onclick="window._switchTasbihPreset(${i}); document.querySelectorAll('.sp-tasbih-pill').forEach((b,idx)=>b.classList.toggle('active', idx===${i}))">
            ${p.label} (${p.target})
          </button>
        `).join('')}
      </div>

      <!-- Big Tap Button -->
      <div class="sp-tasbih-btn-wrap">
        <button class="sp-tasbih-main-btn" onclick="window._tapTasbih()">
          <div id="tasbih-count-val" style="font-size:48px;font-weight:800;color:#fff;line-height:1">0</div>
          <div id="tasbih-target-val" style="font-size:14px;color:rgba(255,255,255,.8);margin-top:4px">/ 33</div>
          <div style="font-size:11px;color:rgba(255,255,255,.9);margin-top:8px;font-weight:600">TAP UNTUK HITUNG</div>
        </button>
      </div>

      <div class="sp-tasbih-progress-bg">
        <div id="tasbih-progress-fill" class="sp-tasbih-progress-fill"></div>
      </div>
    </div>

    <!-- SECTION: AL-QURAN 114 SURAH -->
    <div class="slbl">📖 Al-Qur'an (114 Surah)</div>
    <div class="sp-quran-box">
      <!-- Search & Filters -->
      <div class="sp-quran-controls">
        <div class="sp-search-bar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2"/></svg>
          <input type="text" id="surah-search-input" placeholder="Cari nomor atau nama surah..." oninput="window._filterSurahSearch(this.value)">
        </div>
        <div class="sp-filter-chips">
          <button class="sp-chip active" onclick="window._setSurahFilter('all', this)">Semua (114)</button>
          <button class="sp-chip" onclick="window._setSurahFilter('fav', this)">❤️ Favorit</button>
          <button class="sp-chip" onclick="window._setSurahFilter('Meccan', this)">🕋 Makkiyah</button>
          <button class="sp-chip" onclick="window._setSurahFilter('Medinan', this)">🕌 Madaniyah</button>
        </div>
      </div>

      <!-- Surah Grid Container -->
      <div id="sp-surah-list" class="sp-surah-grid">
        <div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">Memuat surah...</div>
      </div>
    </div>

    <!-- SECTION: KAJIAN -->
    <div class="slbl">💡 Kajian Pencerah Jiwa</div>
    <div class="sp-kajian-list">
      ${KAJIAN_LIST.map(k => `
        <div class="sp-kajian-card" onclick="window._openKajian('${k.id}')">
          <div class="sp-kajian-top">
            <span class="sp-kajian-em">${k.emoji}</span>
            <div class="sp-kajian-meta">
              <div class="sp-kajian-cat">${k.category}</div>
              <div class="sp-kajian-title">${k.title}</div>
            </div>
            <div class="sp-kajian-time">${k.readTime}</div>
          </div>
          <div class="sp-kajian-src">📚 ${k.source}</div>
        </div>
      `).join('')}
    </div>

    <!-- SECTION: DOA HARIAN -->
    <div class="slbl">🤲 Doa Pilihan Penenang Jiwa</div>
    <div class="sp-doa-grid">
      ${DOA_LIST.map((d,i) => `
        <button class="sp-doa-btn" onclick="window._showDoa(${i})">
          <span style="font-size:22px">${d.emoji}</span>
          <span style="font-size:12px;font-weight:700;color:var(--text);line-height:1.3">${d.name}</span>
        </button>
      `).join('')}
    </div>

    <div style="height:32px"></div>
  `;
}

/* ════════════════
   SURAH FILTER & RENDER
════════════════ */
export function filterSurahSearch(query) {
  surahSearchQuery = query.toLowerCase().trim();
  renderSurahGrid();
}
window._filterSurahSearch = filterSurahSearch;

export function setSurahFilter(filter, btn) {
  activeSurahFilter = filter;
  document.querySelectorAll('.sp-filter-chips .sp-chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderSurahGrid();
}
window._setSurahFilter = setSurahFilter;

function renderSurahGrid() {
  const container = document.getElementById('sp-surah-list');
  if (!container) return;

  const surahs = allSurahs || fallbackSurahsList();
  const favs = getFavoriteSurahs();

  let filtered = surahs.filter(s => {
    // Check search query
    const matchQuery = !surahSearchQuery ||
      String(s.number).includes(surahSearchQuery) ||
      (s.name && s.name.toLowerCase().includes(surahSearchQuery)) ||
      (s.englishName && s.englishName.toLowerCase().includes(surahSearchQuery)) ||
      (s.englishNameTranslation && s.englishNameTranslation.toLowerCase().includes(surahSearchQuery));

    if (!matchQuery) return false;

    // Check category filter
    if (activeSurahFilter === 'fav') return favs.includes(s.number);
    if (activeSurahFilter === 'Meccan') return s.revelationType === 'Meccan';
    if (activeSurahFilter === 'Medinan') return s.revelationType === 'Medinan';
    return true;
  });

  if (!filtered.length) {
    container.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--muted);font-size:13px">Tidak ada surah yang cocok dengan pencarian.</div>`;
    return;
  }

  container.innerHTML = filtered.map(s => {
    const isFav = favs.includes(s.number);
    return `
      <div class="sp-surah-btn card-enter" onclick="window._openSurah(${s.number})">
        <span class="sp-surah-no">${s.number}</span>
        <div class="sp-surah-info">
          <div class="sp-surah-name">${s.englishName} <span style="font-family:serif;font-size:14px;color:var(--p1);margin-left:4px">${s.name}</span></div>
          <div class="sp-surah-arti">${s.englishNameTranslation} · ${s.numberOfAyahs} ayat</div>
        </div>
        <button class="sp-surah-fav-btn" onclick="event.stopPropagation(); window._toggleFavSurah(${s.number})">
          ${isFav ? '❤️' : '🤍'}
        </button>
      </div>
    `;
  }).join('');
}

/* ════════════════
   SURAH READER (Audio + Font Resize + Ayah by Ayah)
════════════════ */
let currentFontSize = 'm'; // 's', 'm', 'l'

export async function openSurah(no) {
  const modal = document.getElementById('surah-modal');
  if (!modal) return;

  modal.classList.add('show');
  document.getElementById('surah-modal-title').textContent = `Memuat Surah ${no}...`;
  document.getElementById('surah-modal-content').innerHTML = `
    <div style="text-align:center;padding:48px;color:var(--muted)">
      <div class="dot-spinner" style="font-size:28px;margin-bottom:12px">🌸</div>
      <div>Menyiapkan ayat dan audio tilawah...</div>
    </div>`;

  try {
    const [arRes, idRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${no}`),
      fetch(`https://api.alquran.cloud/v1/surah/${no}/id.indonesian`),
    ]);
    const [arJson, idJson] = await Promise.all([arRes.json(), idRes.json()]);

    if (arJson.code === 200 && idJson.code === 200) {
      renderSurahModal(arJson.data, idJson.data);
    } else {
      throw new Error('Data surah tidak valid');
    }
  } catch (e) {
    document.getElementById('surah-modal-content').innerHTML = `
      <div style="padding:28px;text-align:center;color:var(--muted)">
        Gagal memuat surah. Cek koneksi internet kamu ya.
      </div>`;
  }
}
window._openSurah = openSurah;

function renderSurahModal(arabic, indonesian) {
  document.getElementById('surah-modal-title').textContent = `${arabic.number}. ${arabic.englishName} (${arabic.name})`;

  const ayahs = arabic.ayahs;
  const translations = indonesian.ayahs;

  const fontClass = currentFontSize === 's' ? 'qfont-s' : (currentFontSize === 'l' ? 'qfont-l' : 'qfont-m');

  document.getElementById('surah-modal-content').innerHTML = `
    <div class="surah-reader-bar">
      <div class="surah-meta-badge">${arabic.revelationType === 'Meccan' ? '🕋 Makkiyah' : '🕌 Madaniyah'} · ${arabic.numberOfAyahs} Ayat</div>
      <div class="surah-font-controls">
        <span style="font-size:11px;color:var(--muted);font-weight:600">Ukuran:</span>
        <button class="sfont-btn ${currentFontSize === 's' ? 'active' : ''}" onclick="window._setSurahFont('s')">A-</button>
        <button class="sfont-btn ${currentFontSize === 'm' ? 'active' : ''}" onclick="window._setSurahFont('m')">A</button>
        <button class="sfont-btn ${currentFontSize === 'l' ? 'active' : ''}" onclick="window._setSurahFont('l')">A+</button>
      </div>
    </div>

    ${arabic.number !== 9 ? `<div class="surah-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>` : ''}

    <div class="surah-ayah-list ${fontClass}" id="surah-ayah-list-wrap">
      ${ayahs.map((a, i) => `
        <div class="surah-ayah-item ${activeAyahNum === a.number ? 'playing-now' : ''}" id="ayah-item-${a.number}">
          <div class="surah-ayah-head">
            <span class="surah-ayah-tag">Ayat ${a.numberInSurah}</span>
            <button class="surah-audio-play-btn" id="audio-btn-${a.number}" onclick="window._playAyahAudio(${a.number}, this)">
              ▶️ Putar Tilawah
            </button>
          </div>
          <div class="surah-ar-text">${a.text} <span class="surah-num">﴿${a.numberInSurah}﴾</span></div>
          <div class="surah-id-text">${translations[i]?.text || ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

export function setSurahFont(size) {
  currentFontSize = size;
  const wrap = document.getElementById('surah-ayah-list-wrap');
  if (wrap) {
    wrap.className = `surah-ayah-list qfont-${size}`;
  }
  document.querySelectorAll('.sfont-btn').forEach(b => b.classList.remove('active'));
  event?.target?.classList?.add('active');
}
window._setSurahFont = setSurahFont;

export function playAyahAudio(globalAyahNumber, btn) {
  if (currentAudio) {
    currentAudio.pause();
    document.querySelectorAll('.surah-audio-play-btn').forEach(b => b.textContent = '▶️ Putar Tilawah');
    document.querySelectorAll('.surah-ayah-item').forEach(el => el.classList.remove('playing-now'));
    if (activeAyahNum === globalAyahNumber) {
      activeAyahNum = null;
      return;
    }
  }

  activeAyahNum = globalAyahNumber;
  btn.textContent = '⏸️ Berhenti';
  const itemEl = document.getElementById(`ayah-item-${globalAyahNumber}`);
  if (itemEl) itemEl.classList.add('playing-now');

  currentAudio = new Audio(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyahNumber}.mp3`);
  currentAudio.play().catch(e => {
    btn.textContent = '▶️ Putar Tilawah';
    console.warn('[Audio] Play error:', e.message);
  });

  currentAudio.onended = () => {
    btn.textContent = '▶️ Putar Tilawah';
    if (itemEl) itemEl.classList.remove('playing-now');
    activeAyahNum = null;
  };
}
window._playAyahAudio = playAyahAudio;

export function closeSurah() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  activeAyahNum = null;
  document.getElementById('surah-modal')?.classList.remove('show');
}
window._closeSurah = closeSurah;

/* ════════════════
   KAJIAN READER
════════════════ */
export function openKajian(id) {
  const kajian = KAJIAN_LIST.find(k => k.id === id);
  if (!kajian) return;

  const modal = document.getElementById('kajian-modal');
  if (!modal) return;

  document.getElementById('kajian-modal-emoji').textContent = kajian.emoji;
  document.getElementById('kajian-modal-cat').textContent   = kajian.category;
  document.getElementById('kajian-modal-title').textContent = kajian.title;
  document.getElementById('kajian-modal-src').textContent   = kajian.source;
  document.getElementById('kajian-modal-time').textContent  = kajian.readTime;

  const contentEl = document.getElementById('kajian-modal-content');
  contentEl.innerHTML = kajian.content
    .split('\n')
    .map(line => {
      if (line.startsWith('→')) return `<div class="kjm-arrow">${line}</div>`;
      if (line.startsWith('📿')) return `<div class="kjm-dzikir">${line}</div>`;
      if (line.startsWith('✦')) return `<div class="kjm-tip">${line}</div>`;
      if (line.match(/^\d\./)) return `<div class="kjm-num">${line}</div>`;
      if (line.startsWith('"')) return `<div class="kjm-quote">${line}</div>`;
      if (!line.trim()) return '<div style="height:8px"></div>';
      return `<p class="kjm-p">${line}</p>`;
    })
    .join('');

  modal.classList.add('show');
}
window._openKajian = openKajian;
window._closeKajian = () => document.getElementById('kajian-modal')?.classList.remove('show');

/* ════════════════
   DOA MODAL
════════════════ */
export function showDoa(idx) {
  const doa = DOA_LIST[idx];
  const modal = document.getElementById('doa-modal');
  if (!modal || !doa) return;

  document.getElementById('doa-modal-emoji').textContent  = doa.emoji;
  document.getElementById('doa-modal-name').textContent   = doa.name;
  document.getElementById('doa-modal-ar').textContent     = doa.arabic;
  document.getElementById('doa-modal-lat').textContent    = doa.latin;
  document.getElementById('doa-modal-arti').textContent   = doa.arti;
  document.getElementById('doa-modal-faedah').textContent = doa.faedah;
  modal.classList.add('show');
}
window._showDoa = showDoa;
window._closeDoa = () => document.getElementById('doa-modal')?.classList.remove('show');

/* ════════════════
   RENDER PRAYER
════════════════ */
async function loadAndRenderPrayer() {
  const card = document.getElementById('sp-prayer-card');
  if (!card) return;

  let lat = -6.2088, lon = 106.8456, cityName = 'Jakarta (Default)';

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
          const geoJson = await geoRes.json();
          cityName = geoJson.address?.city || geoJson.address?.county || geoJson.address?.state || 'Lokasi kamu';
        } catch {}
        const timings = await fetchPrayerTimes(lat, lon);
        if (timings) renderPrayerTimes(timings, cityName);
      },
      async () => {
        const timings = await fetchPrayerTimes(lat, lon);
        if (timings) renderPrayerTimes(timings, 'Jakarta');
      }
    );
  } else {
    const timings = await fetchPrayerTimes(lat, lon);
    if (timings) renderPrayerTimes(timings, 'Jakarta');
  }
}

function renderPrayerTimes(timings, cityName) {
  const card = document.getElementById('sp-prayer-card');
  if (!card) return;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  function timeToMinutes(str) {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  }

  const prayers = Object.entries(PRAYER_NAMES).map(([key, info]) => ({
    key,
    ...info,
    time: timings[key] || '--:--',
    minutes: timeToMinutes(timings[key] || '0:0'),
  }));

  const nextPrayer = prayers.find(p => p.minutes > nowMinutes) || prayers[0];
  const minutesLeft = nextPrayer.minutes - nowMinutes;
  const hoursLeft = Math.floor(minutesLeft / 60);
  const minsLeft = minutesLeft % 60;
  const countdownStr = minutesLeft > 0
    ? (hoursLeft > 0 ? `${hoursLeft}j ${minsLeft}m lagi` : `${minsLeft} menit lagi`)
    : 'Sekarang!';

  card.innerHTML = `
    <div class="sp-prayer-city">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" stroke-width="2"/></svg>
      ${cityName}
    </div>

    <div class="sp-next-prayer">
      <div>
        <div class="sp-next-label">Sholat Berikutnya</div>
        <div class="sp-next-name">${nextPrayer.emoji} ${nextPrayer.label}</div>
        <div class="sp-next-time">${nextPrayer.time} WIB</div>
      </div>
      <div class="sp-next-countdown">${countdownStr}</div>
    </div>

    <div class="sp-prayer-row">
      ${prayers.map(p => {
        const isPast = p.minutes < nowMinutes;
        const isNext = p.key === nextPrayer.key;
        return `<div class="sp-prayer-item ${isNext ? 'sp-prayer-next' : ''} ${isPast ? 'sp-prayer-past' : ''}">
          <span class="sp-pi-em">${p.emoji}</span>
          <div class="sp-pi-name">${p.label}</div>
          <div class="sp-pi-time">${p.time}</div>
          ${isPast ? '<div class="sp-pi-done">✓</div>' : ''}
        </div>`;
      }).join('')}
    </div>
  `;
}