/* ═══════════════════════════════════════
   MOODLY — nearby.js  (v20 — CSS self-contained, no nearby.css needed)
═══════════════════════════════════════ */

/* ─── Inject CSS sekali saja ─── */
(function injectCSS() {
  if (document.getElementById('nb-style')) return;
  const s = document.createElement('style');
  s.id = 'nb-style';
  s.textContent = `
/* teaser */
.nb-teaser{background:var(--card,#1c2330);border:1px solid var(--border,#2a3441);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px}
.nb-tr{display:flex;align-items:center;gap:10px}
.nb-tico{width:38px;height:38px;border-radius:10px;flex-shrink:0;background:rgba(63,185,80,.12);display:flex;align-items:center;justify-content:center;font-size:19px}
.nb-ttl{font-size:13px;font-weight:600;margin-bottom:2px}
.nb-tsub{font-size:11px;color:var(--muted,#7d8590)}
.nb-tbtns{display:flex;gap:7px}
.nb-tbtn{flex:1;text-align:center;text-decoration:none;font-size:12px;font-weight:500;padding:7px 10px;border-radius:9px;transition:opacity .15s}
.nb-tbtn:hover{opacity:.8}
.nb-tg{background:rgba(63,185,80,.15);color:#3fb950;border:1px solid rgba(63,185,80,.25)}
.nb-tb{background:rgba(88,166,255,.12);color:#58a6ff;border:1px solid rgba(88,166,255,.2)}
.nb-topen{width:100%;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:500;font-family:inherit;background:var(--surface,#161b22);border:1px solid var(--border,#2a3441);color:var(--text,#e6edf3);padding:9px;border-radius:9px;cursor:pointer;transition:border-color .2s,color .2s}
.nb-topen:hover{border-color:#3fb950;color:#3fb950}

/* panel overlay */
#nb-panel{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);display:flex;align-items:flex-end;opacity:0;pointer-events:none;transition:opacity .25s ease}
#nb-panel.nb-open{opacity:1;pointer-events:all}

/* panel box */
.nb-panel-box{width:100%;max-width:540px;margin:0 auto;max-height:92dvh;background:var(--surface,#161b22);border-radius:20px 20px 0 0;border-top:1px solid var(--border,#2a3441);display:flex;flex-direction:column;transform:translateY(100%);transition:transform .3s cubic-bezier(.32,1,.55,1);overflow:hidden}
#nb-panel.nb-open .nb-panel-box{transform:translateY(0)}
.nb-panel-box::before{content:'';display:block;width:36px;height:4px;border-radius:2px;background:var(--border,#2a3441);margin:10px auto 0;flex-shrink:0}

/* header */
.nb-ph{display:flex;align-items:center;gap:10px;padding:10px 16px 8px;flex-shrink:0}
.nb-pback{background:none;border:none;color:var(--muted,#7d8590);cursor:pointer;display:flex;align-items:center;padding:4px;border-radius:6px;transition:color .15s}
.nb-pback:hover{color:var(--text,#e6edf3)}
.nb-ptitle{font-size:14px;font-weight:600;flex:1}
.nb-ploc{font-size:10px;color:var(--muted,#7d8590);background:var(--card,#1c2330);border:1px solid var(--border,#2a3441);padding:3px 9px;border-radius:20px;white-space:nowrap;max-width:130px;overflow:hidden;text-overflow:ellipsis}

/* search */
.nb-psearch{display:flex;align-items:center;gap:8px;margin:0 14px 8px;background:var(--card,#1c2330);border:1px solid var(--border,#2a3441);border-radius:10px;padding:8px 12px;flex-shrink:0}
.nb-psearch svg{color:var(--muted,#7d8590);flex-shrink:0}
.nb-psearch input{flex:1;background:none;border:none;outline:none;font-size:13px;font-family:inherit;color:var(--text,#e6edf3)}
.nb-psearch input::placeholder{color:var(--muted,#7d8590)}

/* chip rows */
.nb-scrolx{display:flex;gap:6px;padding:0 14px 8px;overflow-x:auto;scrollbar-width:none;flex-shrink:0}
.nb-scrolx::-webkit-scrollbar{display:none}
.nb-chip,.nb-chip2{flex-shrink:0;white-space:nowrap;font-size:12px;font-family:inherit;padding:5px 13px;border-radius:20px;cursor:pointer;background:var(--card,#1c2330);border:1px solid var(--border,#2a3441);color:var(--muted,#7d8590);transition:all .15s}
.nb-chip:hover,.nb-chip2:hover{color:var(--text,#e6edf3)}
.nb-chip.on{background:rgba(63,185,80,.15);border-color:#3fb950;color:#3fb950}
.nb-chip2.on{background:rgba(88,166,255,.1);border-color:#58a6ff;color:#58a6ff}

/* count */
.nb-pcount{padding:0 16px 8px;display:flex;align-items:center;gap:8px;flex-shrink:0;font-size:11px;color:var(--muted,#7d8590)}

/* list */
.nb-plist{flex:1;overflow-y:auto;padding:0 12px 24px;display:flex;flex-direction:column;gap:8px}
.nb-plist::-webkit-scrollbar{width:3px}
.nb-plist::-webkit-scrollbar-thumb{background:var(--border,#2a3441);border-radius:2px}

/* spinner */
.nb-pspinner{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 0;gap:8px}
.nb-dots{display:flex;gap:5px}
.nb-dot{width:7px;height:7px;border-radius:50%;background:#3fb950;animation:nb-bounce .9s ease-in-out infinite}
.nb-dot:nth-child(2){animation-delay:.15s}
.nb-dot:nth-child(3){animation-delay:.3s}
@keyframes nb-bounce{0%,80%,100%{transform:scale(.5);opacity:.3}40%{transform:scale(1);opacity:1}}

.nb-empty{text-align:center;padding:40px 0;font-size:13px;color:var(--muted,#7d8590);line-height:1.6}

/* section label */
.nb-slabel{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#7d8590);padding:8px 4px 4px;display:flex;align-items:center;gap:8px}
.nb-slabel::after{content:'';flex:1;height:1px;background:var(--border,#2a3441)}

/* card */
.nb-card{background:var(--card,#1c2330);border:1px solid var(--border,#2a3441);border-radius:12px;padding:13px;animation:nb-fadein .25s ease both}
.nb-card.nb-cv{border-color:rgba(63,185,80,.2)}
.nb-card.nb-cv:hover{border-color:rgba(63,185,80,.4)}
@keyframes nb-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.nb-ch{display:flex;align-items:flex-start;gap:9px;margin-bottom:7px}
.nb-cico{width:34px;height:34px;border-radius:9px;flex-shrink:0;background:var(--surface,#161b22);display:flex;align-items:center;justify-content:center;font-size:17px}
.nb-ci{flex:1;min-width:0}
.nb-cn{font-size:13px;font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nb-ca{font-size:11px;color:var(--muted,#7d8590)}

/* badges */
.nb-badge{font-size:10px;padding:2px 7px;border-radius:20px;white-space:nowrap}
.nb-bpsikiater{background:#1a2a4a;color:#58a6ff;border:1px solid #2a3a6a}
.nb-bpsikolog{background:#1a3a2a;color:#3fb950;border:1px solid #2a4a3a}
.nb-bklinik{background:#2a2a1a;color:#d29922;border:1px solid #3a3a2a}
.nb-bonline{background:#2a1a3a;color:#bc8cff;border:1px solid #3a2a4a}
.nb-bok{background:#1a3a2a;color:#3fb950;border:1px solid #2a4a3a;font-size:9px}

.nb-cdesc{font-size:11px;color:var(--muted,#7d8590);line-height:1.5;margin-bottom:7px}
.nb-cmeta{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--muted,#7d8590);margin-bottom:7px}
.nb-ctags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
.nb-tag{font-size:10px;background:var(--surface,#161b22);border:1px solid var(--border,#2a3441);color:var(--muted,#7d8590);padding:2px 7px;border-radius:5px}

/* buttons */
.nb-cbtns{display:flex;flex-wrap:wrap;gap:5px}
.nb-btn{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:500;font-family:inherit;padding:5px 11px;border-radius:7px;text-decoration:none;cursor:pointer;transition:opacity .15s;border:1px solid transparent}
.nb-btn:hover{opacity:.8}
.nb-bcall{background:rgba(63,185,80,.15);color:#3fb950;border-color:rgba(63,185,80,.25)}
.nb-bweb{background:rgba(88,166,255,.1);color:#58a6ff;border-color:rgba(88,166,255,.2)}
.nb-bmap{background:var(--surface,#161b22);color:var(--muted,#7d8590);border-color:var(--border,#2a3441)}
  `;
  document.head.appendChild(s);
})();

let nb = {
  filter  : 'semua',
  city    : 'gps',
  search  : '',
  loc     : null,
  osmData : [],
  osmDone : false,
};

/* ─── Data hardcode verified ─── */
const STATIC = [
  /* ONLINE */
  { id:'s1', type:'online', city:'online', name:'Into The Light Indonesia', emoji:'💚', area:'Nasional', verified:true, phone:'119', website:'https://www.intothelightid.org', email:'info@intothelightid.org', hours:'Sen–Jum 09.00–17.00', price:'Gratis', tags:['Hotline','Konseling','Bunuh Diri'], desc:'Hotline & konseling nasional berbasis bukti untuk pencegahan bunuh diri.', maps:null },
  { id:'s2', type:'online', city:'online', name:'Riliv – Psikolog Online',   emoji:'💻', area:'Nasional', verified:true, phone:null, website:'https://riliv.co', email:null, hours:'24 Jam', price:'Rp 150k–300k/sesi', tags:['Chat Psikolog','Meditasi'], desc:'300+ psikolog berlisensi, konsultasi via chat & video call.', maps:null },
  { id:'s3', type:'online', city:'online', name:'Sejiwa (119 ext 8)',         emoji:'📞', area:'Nasional', verified:true, phone:'119', website:'https://sejiwa.org', email:null, hours:'24 Jam', price:'Gratis', tags:['Hotline','Krisis','Remaja'], desc:'Hotline jiwa nasional gratis 24 jam dari Kemenkes RI.', maps:null },
  { id:'s4', type:'online', city:'online', name:'Yayasan Pulih (Online)',     emoji:'🧡', area:'Nasional', verified:true, phone:'(021) 788-42580', website:'https://yayasanpulih.org', email:'yayasanpulih@cbn.net.id', hours:'Sen–Jum 08.00–17.00', price:'Sliding scale', tags:['Trauma','Komunitas','BPJS'], desc:'Konseling berbasis komunitas sejak 2000, tarif sesuai kemampuan.', maps:null },

  /* JAKARTA */
  { id:'j1', type:'psikiater', city:'jakarta', name:'RSJ Dr. Soeharto Heerdjan', emoji:'🏥', area:'Jakarta Barat', verified:true, phone:'(021) 5682841', website:'https://rsjsh.co.id', email:null, hours:'24 Jam (IGD)', price:'BPJS & Umum', tags:['RS Jiwa','IGD','Rawat Inap'], desc:'RS Jiwa negeri terbesar Jakarta, poli jiwa & rawat inap lengkap.', maps:'https://maps.google.com/?q=RSJ+Soeharto+Heerdjan+Jakarta' },
  { id:'j2', type:'psikiater', city:'jakarta', name:'RSKJ Dharma Graha',          emoji:'🏥', area:'Serpong, Tangsel', verified:true, phone:'(021) 7560670', website:'https://rskjdharmagraha.com', email:null, hours:'24 Jam', price:'Umum', tags:['RS Jiwa','Rehabilitasi'], desc:'RS Khusus Jiwa swasta, rawat inap & program rehabilitasi.', maps:'https://maps.google.com/?q=RSKJ+Dharma+Graha+Serpong' },
  { id:'j3', type:'klinik',    city:'jakarta', name:'Personal Growth',             emoji:'🧩', area:'Jakarta Barat', verified:true, phone:'021-58906870', website:'https://www.personalgrowth.co.id', email:null, hours:'Sen–Sab 09.00–18.00', price:'Hubungi klinik', tags:['Psikolog','Terapi','Asesmen'], desc:'Klinik psikologi klinis terkemuka, psikolog & psikiater berlisensi.', maps:'https://maps.google.com/?q=Personal+Growth+Jakarta+Barat' },
  { id:'j4', type:'klinik',    city:'jakarta', name:'Yayasan Pulih',               emoji:'🧡', area:'Jakarta Selatan', verified:true, phone:'(021) 788-42580', website:'https://yayasanpulih.org', email:'yayasanpulih@cbn.net.id', hours:'Sen–Jum 08.00–17.00', price:'Sliding scale', tags:['Trauma','Komunitas'], desc:'Konseling tatap muka, tarif sliding scale sejak 2000.', maps:'https://maps.google.com/?q=Yayasan+Pulih+Jakarta' },
  { id:'j5', type:'klinik',    city:'jakarta', name:'Intl. Wellbeing Center',      emoji:'🌿', area:'Jakarta Selatan', verified:true, phone:'(021) 80657670', website:'https://internationalwellbeingcenter.com', email:null, hours:'Sen–Sab 09.00–18.00', price:'Hubungi klinik', tags:['Psikolog','Psikiater','Bilingual'], desc:'Pusat kesehatan jiwa internasional, tersedia dalam dua bahasa.', maps:'https://maps.google.com/?q=International+Wellbeing+Center+Jakarta' },
  { id:'j6', type:'klinik',    city:'jakarta', name:'Klinik Psikologi UI',         emoji:'🎓', area:'Depok', verified:true, phone:'(021) 78881150', website:null, email:null, hours:'Sen–Jum 08.00–16.00', price:'Terjangkau', tags:['Psikolog','Asesmen'], desc:'Klinik psikologi klinis Universitas Indonesia yang terpercaya.', maps:'https://maps.google.com/?q=Klinik+Psikologi+UI+Depok' },

  /* SURABAYA */
  { id:'sb1', type:'psikiater', city:'surabaya', name:'RSJ Menur Surabaya',      emoji:'🏥', area:'Gubeng, Surabaya', verified:true, phone:'(031) 5021635', website:'https://rsjmenur.jatimprov.go.id', email:null, hours:'24 Jam (IGD)', price:'BPJS & Umum', tags:['RS Jiwa','IGD'], desc:'RS Jiwa Pemprov Jatim, layanan psikiater terlengkap di Surabaya.', maps:'https://maps.google.com/?q=RSJ+Menur+Surabaya' },
  { id:'sb2', type:'klinik',    city:'surabaya', name:'Unit Psikologi UNAIR',     emoji:'🎓', area:'Airlangga, Surabaya', verified:true, phone:'(031) 5047251', website:null, email:null, hours:'Sen–Jum 08.00–15.00', price:'Terjangkau', tags:['Psikolog','Asesmen'], desc:'Layanan psikologi klinis Universitas Airlangga.', maps:'https://maps.google.com/?q=Psikologi+UNAIR+Surabaya' },
  { id:'sb3', type:'psikiater', city:'surabaya', name:'RS Husada Utama — Poli Jiwa', emoji:'🏥', area:'Gubeng, Surabaya', verified:true, phone:'(031) 5018335', website:null, email:null, hours:'Sen–Sab 07.00–14.00', price:'Umum & BPJS', tags:['Poli Jiwa','Psikiater'], desc:'Poli jiwa RS Husada Utama dengan psikiater berpengalaman.', maps:'https://maps.google.com/?q=RS+Husada+Utama+Surabaya' },

  /* BANDUNG */
  { id:'bdg1', type:'psikiater', city:'bandung', name:'RSHS — Poli Jiwa',          emoji:'🏥', area:'Pasteur, Bandung', verified:true, phone:'(022) 2551111', website:'https://www.rshs.or.id', email:null, hours:'24 Jam', price:'BPJS & Umum', tags:['RSUP','Poli Jiwa'], desc:'RSUP terbesar Jabar, poli jiwa dengan psikiater spesialis.', maps:'https://maps.google.com/?q=RS+Hasan+Sadikin+Bandung' },
  { id:'bdg2', type:'psikiater', city:'bandung', name:'RS Jiwa Prov. Jawa Barat',  emoji:'🏥', area:'Cisarua, Bandung Barat', verified:true, phone:'(022) 2786055', website:null, email:null, hours:'24 Jam', price:'BPJS & Umum', tags:['RS Jiwa','Rawat Inap'], desc:'RS Jiwa Pemprov Jabar, psikiater & program rawat inap.', maps:'https://maps.google.com/?q=RS+Jiwa+Cisarua+Bandung' },
  { id:'bdg3', type:'klinik',    city:'bandung', name:'Pusat Psikologi UPI',       emoji:'🎓', area:'Sukasari, Bandung', verified:true, phone:'08112223100', website:null, email:null, hours:'Sen–Jum 08.00–16.00', price:'Terjangkau', tags:['Psikolog','Konseling'], desc:'Pusat psikologi terapan Universitas Pendidikan Indonesia.', maps:'https://maps.google.com/?q=Pusat+Psikologi+UPI+Bandung' },

  /* YOGYAKARTA */
  { id:'y1', type:'psikiater', city:'yogyakarta', name:'RSJ Grhasia Yogyakarta',      emoji:'🏥', area:'Pakem, Sleman', verified:true, phone:'(0274) 895231', website:'https://rsjgrhasia.jogjaprov.go.id', email:null, hours:'24 Jam', price:'BPJS & Umum', tags:['RS Jiwa','IGD'], desc:'RS Jiwa Pemprov DIY, layanan psikiater & rehabilitasi jiwa.', maps:'https://maps.google.com/?q=RSJ+Grhasia+Yogyakarta' },
  { id:'y2', type:'psikiater', city:'yogyakarta', name:'RSUP Sardjito — Poli Jiwa',  emoji:'🏥', area:'Mlati, Sleman', verified:true, phone:'(0274) 587333', website:'https://www.sardjito.co.id', email:null, hours:'Sen–Sab 07.00–14.00', price:'BPJS & Umum', tags:['RSUP','Poli Jiwa'], desc:'RSUP terbesar DIY, poli jiwa dengan tim psikiater spesialis.', maps:'https://maps.google.com/?q=RSUP+Sardjito+Yogyakarta' },
  { id:'y3', type:'klinik',    city:'yogyakarta', name:'Klinik Psikologi UGM',       emoji:'🎓', area:'Bulaksumur, Yogyakarta', verified:true, phone:'(0274) 550435', website:'https://psikologi.ugm.ac.id', email:null, hours:'Sen–Jum 08.00–16.00', price:'Terjangkau', tags:['Psikolog','Konseling'], desc:'Layanan psikologi klinis Universitas Gadjah Mada.', maps:'https://maps.google.com/?q=Klinik+Psikologi+UGM+Yogyakarta' },

  /* MEDAN */
  { id:'m1', type:'psikiater', city:'medan', name:'RSJ Prof. M. Ildrem',          emoji:'🏥', area:'Medan', verified:true, phone:'(061) 8361255', website:null, email:null, hours:'24 Jam', price:'BPJS & Umum', tags:['RS Jiwa','IGD'], desc:'RS Jiwa pemerintah Sumut, layanan jiwa terlengkap di Medan.', maps:'https://maps.google.com/?q=RSJ+Ildrem+Medan' },
  { id:'m2', type:'psikiater', city:'medan', name:'RSUP Adam Malik — Poli Jiwa', emoji:'🏥', area:'Medan', verified:true, phone:'(061) 8360381', website:'https://www.adammalik.co.id', email:null, hours:'Sen–Sab 07.30–14.00', price:'BPJS & Umum', tags:['RSUP','Poli Jiwa'], desc:'RSUP terbesar Sumut, poli jiwa dan psikiater spesialis.', maps:'https://maps.google.com/?q=RSUP+Adam+Malik+Medan' },
];

const CITIES = [
  { id:'gps',        label:'📍 Terdekat' },
  { id:'online',     label:'💻 Online' },
  { id:'jakarta',    label:'Jakarta' },
  { id:'surabaya',   label:'Surabaya' },
  { id:'bandung',    label:'Bandung' },
  { id:'yogyakarta', label:'Yogyakarta' },
  { id:'medan',      label:'Medan' },
];

const TYPES = [
  { id:'semua',     label:'Semua' },
  { id:'psikolog',  label:'🧠 Psikolog' },
  { id:'psikiater', label:'🏥 Psikiater' },
  { id:'klinik',    label:'🏨 Klinik' },
  { id:'online',    label:'💻 Online' },
];

const BL = ['puskesmas','posyandu','pustu','bidan','gigi','dental','mata','optik',
  'kandungan','kebidanan','hewan','apotek','farmasi','lab','radiologi',
  'fisioterapi','kecantikan','spa','salon','paru','jantung','bedah','ginjal','tht'];

/* ════════════════════════════════
   TEASER — di homepage (seperti widget kecil)
════════════════════════════════ */
export function initNearby() {
  const wrap = document.getElementById('nearby-wrap');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="nb-teaser">
      <div class="nb-tr">
        <div class="nb-tico">🧠</div>
        <div>
          <div class="nb-ttl">Butuh bantuan profesional?</div>
          <div class="nb-tsub">Psikolog & psikiater berlisensi terdekat</div>
        </div>
      </div>
      <div class="nb-tbtns">
        <a class="nb-tbtn nb-tg" href="tel:119">📞 Hotline 119</a>
        <a class="nb-tbtn nb-tb" href="https://riliv.co" target="_blank" rel="noopener">💻 Riliv</a>
      </div>
      <button class="nb-topen" onclick="window._findNearby()">
        Lihat Semua Layanan
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
    </div>`;
}

/* ════════════════════════════════
   PANEL — slide up seperti chat
════════════════════════════════ */
export function findNearby() {
  let panel = document.getElementById('nb-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'nb-panel';
    panel.innerHTML = panelHTML();
    document.body.appendChild(panel);
    bindEvents(panel);
  }
  requestAnimationFrame(() => panel.classList.add('nb-open'));
  if (!nb.loc) initData();
  else renderList();
}

function panelHTML() {
  return `
  <div class="nb-panel-box" id="nb-box">
    <div class="nb-ph">
      <button class="nb-pback" id="nb-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <span class="nb-ptitle">Layanan Kesehatan Mental</span>
      <span class="nb-ploc" id="nb-ploc">Mendeteksi…</span>
    </div>

    <div class="nb-psearch">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      <input id="nb-sinput" type="text" placeholder="Cari nama, kota, layanan…"/>
    </div>

    <div class="nb-scrolx" id="nb-cities">
      ${CITIES.map(c => `<button class="nb-chip ${c.id==='gps'?'on':''}" data-city="${c.id}">${c.label}</button>`).join('')}
    </div>

    <div class="nb-scrolx" id="nb-types">
      ${TYPES.map(t => `<button class="nb-chip2 ${t.id==='semua'?'on':''}" data-type="${t.id}">${t.label}</button>`).join('')}
    </div>

    <div class="nb-pcount">
      <span id="nb-cnt">Memuat…</span>
      <span id="nb-osmnote" style="display:none;font-size:10px;color:var(--muted)"></span>
    </div>

    <div class="nb-plist" id="nb-plist">
      <div class="nb-pspinner">
        <div class="nb-dots"><div class="nb-dot"></div><div class="nb-dot"></div><div class="nb-dot"></div></div>
        <div id="nb-stxt" style="font-size:12px;color:var(--muted);margin-top:8px">Mendeteksi lokasi…</div>
      </div>
    </div>
  </div>`;
}

function bindEvents(panel) {
  panel.addEventListener('click', e => {
    if (e.target === panel) closePanel();
  });
  document.getElementById('nb-back').onclick = closePanel;

  document.getElementById('nb-sinput').addEventListener('input', e => {
    nb.search = e.target.value.trim();
    renderList();
  });

  document.getElementById('nb-cities').addEventListener('click', async e => {
    const btn = e.target.closest('.nb-chip');
    if (!btn) return;
    document.querySelectorAll('#nb-cities .nb-chip').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    nb.city = btn.dataset.city;
    if (nb.city === 'gps' && !nb.osmDone && nb.loc) await loadOSM();
    renderList();
  });

  document.getElementById('nb-types').addEventListener('click', e => {
    const btn = e.target.closest('.nb-chip2');
    if (!btn) return;
    document.querySelectorAll('#nb-types .nb-chip2').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    nb.filter = btn.dataset.type;
    renderList();
  });
}

function closePanel() {
  const panel = document.getElementById('nb-panel');
  if (panel) panel.classList.remove('nb-open');
}

/* ════════════════════════════════
   DATA & LOKASI
════════════════════════════════ */
async function initData() {
  setSpin('Mendeteksi lokasi…');
  await detectLoc();
  renderList();
  if (nb.loc) loadOSM();
}

function setSpin(t) {
  const el = document.getElementById('nb-stxt');
  if (el) el.textContent = t;
}

function setLoc(t) {
  const el = document.getElementById('nb-ploc');
  if (el) el.textContent = t;
}

async function detectLoc() {
  try {
    const c = await Promise.race([getGPS(), new Promise((_,r)=>setTimeout(()=>r(new Error),8000))]);
    const city = await revGeo(c.lat, c.lng);
    nb.loc = { lat:c.lat, lng:c.lng, city };
    setLoc('📍 '+(city||'GPS'));
    return;
  } catch {}
  try {
    const ip = await Promise.race([fetch('https://ipapi.co/json/').then(r=>r.json()), new Promise((_,r)=>setTimeout(()=>r(new Error),4000))]);
    if (ip?.city) {
      nb.loc = { lat:ip.latitude, lng:ip.longitude, city:ip.city };
      setLoc('🌐 '+ip.city);
      return;
    }
  } catch {}
  nb.loc = { lat:-6.2088, lng:106.8456, city:'Jakarta' };
  setLoc('🗺️ Jakarta');
}

function getGPS() {
  return new Promise((res,rej) => {
    if (!navigator.geolocation) return rej(new Error('no_geo'));
    navigator.geolocation.getCurrentPosition(
      p => res({lat:p.coords.latitude,lng:p.coords.longitude}),
      rej, {timeout:7000,maximumAge:600000}
    );
  });
}

async function revGeo(lat,lng) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`,{headers:{'User-Agent':'MoodlyApp/1.0'}});
    const d = await r.json(); const a=d.address||{};
    return a.city||a.town||a.village||a.state||null;
  } catch { return null; }
}

async function loadOSM() {
  if (nb.osmDone||!nb.loc) return;
  try {
    const {lat,lng}=nb.loc, r=8000;
    const q=`[out:json][timeout:20];(node["healthcare"="psychologist"](around:${r},${lat},${lng});node["healthcare"="psychiatrist"](around:${r},${lat},${lng});node["amenity"="hospital"](around:${r},${lat},${lng});way["amenity"="hospital"](around:${r},${lat},${lng}););out body center 20;`;
    const res=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q)});
    if(!res.ok) throw new Error();
    const data=await res.json();
    const seen=new Set();
    nb.osmData=(data.elements||[]).filter(e=>{
      if(!e.tags?.name||seen.has(e.id)) return false;
      const nm=(e.tags.name||'').toLowerCase();
      if(BL.some(b=>nm.includes(b))) return false;
      seen.add(e.id); return true;
    }).map(e=>{
      const t=e.tags||{},nm=(t.name||'').toLowerCase(),hc=(t.healthcare||'').toLowerCase();
      const type=hc==='psychologist'||nm.includes('psikolog')?'psikolog':'psikiater';
      const la=e.lat??e.center?.lat, lo=e.lon??e.center?.lon;
      return {id:'osm_'+e.id,type,city:'osm',verified:false,name:t.name||'—',emoji:type==='psikolog'?'🧠':'🏥',area:t['addr:city']||t['addr:suburb']||'',phone:t.phone||t['contact:phone']||null,website:t.website||null,email:t.email||null,hours:t.opening_hours||'Sesuai appointment',price:'Hubungi untuk info harga',tags:[t.healthcare,t.amenity].filter(Boolean).map(x=>x.replace(/_/g,' ')),desc:null,maps:la?`https://www.google.com/maps?q=${la},${lo}`:null};
    });
    console.log('[nearby] OSM:',nb.osmData.length);
  } catch(e) { console.warn('[nearby] OSM err:',e.message); }
  nb.osmDone=true;
  if(nb.city==='gps') renderList();
}

/* ════════════════════════════════
   RENDER
════════════════════════════════ */
function getPool() {
  let p = nb.city==='gps'
    ? [...STATIC,...nb.osmData]
    : nb.city==='online'
      ? STATIC.filter(d=>d.city==='online')
      : STATIC.filter(d=>d.city===nb.city||d.city==='online');

  if(nb.filter!=='semua') p=p.filter(d=>d.type===nb.filter);
  if(nb.search){const q=nb.search.toLowerCase();p=p.filter(d=>d.name.toLowerCase().includes(q)||d.area.toLowerCase().includes(q)||d.tags.some(t=>t.toLowerCase().includes(q)));}
  return p;
}

function renderList() {
  const el=document.getElementById('nb-plist'); if(!el) return;
  const pool=getPool();
  const vr=pool.filter(d=>d.verified), osm=pool.filter(d=>!d.verified);

  const cnt=document.getElementById('nb-cnt'); if(cnt) cnt.textContent=`${pool.length} layanan`;
  const note=document.getElementById('nb-osmnote');
  if(note){if(osm.length){note.style.display='inline';note.textContent=`+${osm.length} dari peta`;}else note.style.display='none';}

  if(!pool.length){el.innerHTML=`<div class="nb-empty">Tidak ada hasil.<br>Coba filter lain.</div>`;return;}

  let h='';
  if(vr.length) h+=`<div class="nb-slabel">✅ Terverifikasi</div>`+vr.map(cardHTML).join('');
  if(osm.length) h+=`<div class="nb-slabel">📍 Data Peta Sekitar</div>`+osm.map(cardHTML).join('');
  el.innerHTML=h;
}

function cardHTML(d) {
  const TL={psikolog:'Psikolog',psikiater:'Psikiater',klinik:'Klinik',online:'Online'};
  const safe=(d.name||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');
  return `
  <div class="nb-card ${d.verified?'nb-cv':''}">
    <div class="nb-ch">
      <span class="nb-cico">${d.emoji}</span>
      <div class="nb-ci">
        <div class="nb-cn">${d.name}</div>
        <div class="nb-ca">${d.type==='online'?'🌐 Online':'📍 '+d.area}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0">
        <span class="nb-badge nb-b${d.type}">${TL[d.type]||d.type}</span>
        ${d.verified?'<span class="nb-badge nb-bok">✓ Verified</span>':''}
      </div>
    </div>
    ${d.desc?`<div class="nb-cdesc">${d.desc}</div>`:''}
    <div class="nb-cmeta">
      <span>🕐 ${d.hours}</span>
      <span>💰 ${d.price}</span>
    </div>
    ${d.tags?.length?`<div class="nb-ctags">${d.tags.slice(0,3).map(t=>`<span class="nb-tag">${t}</span>`).join('')}</div>`:''}
    <div class="nb-cbtns">
      ${d.phone?`<a class="nb-btn nb-bcall" href="tel:${d.phone.replace(/\s/g,'')}">📞 ${d.phone}</a>`:''}
      ${d.website?`<a class="nb-btn nb-bweb" href="${d.website}" target="_blank" rel="noopener">🌐 Website</a>`:''}
      ${d.maps
        ?`<a class="nb-btn nb-bmap" href="${d.maps}" target="_blank" rel="noopener">📍 Maps</a>`
        :`<button class="nb-btn nb-bmap" onclick="window.open('https://maps.google.com/?q='+encodeURIComponent('${safe}'),'_blank')">📍 Maps</button>`}
    </div>
  </div>`;
}

/* ════════════════════════════════
   EXPORTS
════════════════════════════════ */
export function filterNearby()  {}
export function refreshNearby() { nb.osmData=[]; nb.osmDone=false; nb.loc=null; findNearby(); }
export function searchNearby(n) { window.open(`https://maps.google.com/?q=${encodeURIComponent(n+' kesehatan mental')}`, '_blank'); }