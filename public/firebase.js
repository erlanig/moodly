/* ═══════════════════════════════════════
   MOODLY — firebase.js
   Firebase init + all Firestore operations
   ═══════════════════════════════════════ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  doc, collection,
  getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc,
  query, orderBy, limit, onSnapshot, serverTimestamp,
  where
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDG-EOW5wlRw7DMPoggax75cgIBRqrwsY4",
  authDomain: "moodly-26.firebaseapp.com",
  projectId: "moodly-26",
  storageBucket: "moodly-26.firebasestorage.app",
  messagingSenderId: "1024692129965",
  appId: "1:1024692129965:web:e845c6ac1aaa7574c4f624",
  measurementId: "G-GNNWT0NGQF"
};

/* ── Init ── */
const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(firebaseApp);

/* ── Device ID (anonymous, persisted) ── */
function getDeviceId() {
  let id = localStorage.getItem('moodly_device_id');
  if (!id) {
    id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('moodly_device_id', id);
  }
  return id;
}
const DEVICE_ID = getDeviceId();

/* ── Collection refs ── */
const userDocRef    = () => doc(db, 'users', DEVICE_ID);
const entriesRef    = () => collection(db, 'users', DEVICE_ID, 'entries');
const cycleLogsRef  = () => collection(db, 'users', DEVICE_ID, 'cycleLogs');
const periodsRef    = () => collection(db, 'users', DEVICE_ID, 'periods');
const newsCacheRef  = () => doc(db, 'users', DEVICE_ID, 'cache', 'news');

/* ════════════════════════════════
   STATUS & CONNECTIVITY
════════════════════════════════ */
let _syncOk = false;
export function isSynced() { return _syncOk; }

export async function checkConnection() {
  try {
    await getDoc(userDocRef());
    _syncOk = true;
    return true;
  } catch (e) {
    _syncOk = false;
    return false;
  }
}

/* ════════════════════════════════
   USER PROFILE
════════════════════════════════ */
export async function loadProfile() {
  try {
    const snap = await getDoc(userDocRef());
    if (snap.exists()) return snap.data();
    return null;
  } catch (e) {
    console.warn('[FB] loadProfile:', e.message);
    return null;
  }
}

export async function saveProfile(data) {
  try {
    await setDoc(userDocRef(), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    _syncOk = true;
  } catch (e) {
    console.warn('[FB] saveProfile:', e.message);
    _syncOk = false;
    // fallback localStorage
    localStorage.setItem('moodly_profile_local', JSON.stringify(data));
  }
}

/* ════════════════════════════════
   MOOD ENTRIES
════════════════════════════════ */
export async function loadEntries() {
  try {
    const q = query(entriesRef(), orderBy('ts', 'asc'));
    const snap = await getDocs(q);
    _syncOk = true;
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[FB] loadEntries:', e.message);
    _syncOk = false;
    // fallback local
    try { return JSON.parse(localStorage.getItem('moodly2') || '[]'); } catch { return []; }
  }
}

export async function addEntry(entry) {
  try {
    const docRef = await addDoc(entriesRef(), {
      ...entry,
      ts: entry.ts || new Date().toISOString(),
      createdAt: serverTimestamp()
    });
    _syncOk = true;
    return docRef.id;
  } catch (e) {
    console.warn('[FB] addEntry:', e.message);
    _syncOk = false;
    // fallback local
    const local = JSON.parse(localStorage.getItem('moodly2') || '[]');
    local.push(entry);
    localStorage.setItem('moodly2', JSON.stringify(local));
    return null;
  }
}

export async function deleteAllEntries() {
  try {
    const snap = await getDocs(entriesRef());
    const dels = snap.docs.map(d => deleteDoc(doc(db, 'users', DEVICE_ID, 'entries', d.id)));
    await Promise.all(dels);
  } catch (e) {
    console.warn('[FB] deleteAllEntries:', e.message);
  }
}

/* ════════════════════════════════
   CYCLE SETTINGS
════════════════════════════════ */
export async function loadCycleSettings() {
  try {
    const snap = await getDoc(userDocRef());
    if (snap.exists() && snap.data().cycleSettings) {
      return snap.data().cycleSettings;
    }
    return null;
  } catch (e) {
    console.warn('[FB] loadCycleSettings:', e.message);
    try { return JSON.parse(localStorage.getItem('moodly_cycle') || 'null'); } catch { return null; }
  }
}

export async function saveCycleSettings(settings) {
  try {
    await setDoc(userDocRef(), {
      cycleSettings: settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
    _syncOk = true;
  } catch (e) {
    console.warn('[FB] saveCycleSettings:', e.message);
    localStorage.setItem('moodly_cycle', JSON.stringify(settings));
  }
}

/* ════════════════════════════════
   PERIOD LOGS (manual entries)
   Each doc = one period event
   { startDate, endDate, flow, symptoms, notes }
════════════════════════════════ */
export async function loadPeriods() {
  try {
    const q = query(periodsRef(), orderBy('startDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[FB] loadPeriods:', e.message);
    try { return JSON.parse(localStorage.getItem('moodly_periods') || '[]'); } catch { return []; }
  }
}

export async function addPeriod(period) {
  try {
    const ref = await addDoc(periodsRef(), {
      ...period,
      createdAt: serverTimestamp()
    });
    _syncOk = true;
    return ref.id;
  } catch (e) {
    console.warn('[FB] addPeriod:', e.message);
    const local = JSON.parse(localStorage.getItem('moodly_periods') || '[]');
    const withId = { ...period, id: 'local_' + Date.now() };
    local.unshift(withId);
    localStorage.setItem('moodly_periods', JSON.stringify(local));
    return withId.id;
  }
}

export async function updatePeriod(id, data) {
  try {
    if (id.startsWith('local_')) throw new Error('local id');
    await updateDoc(doc(db, 'users', DEVICE_ID, 'periods', id), data);
  } catch (e) {
    console.warn('[FB] updatePeriod:', e.message);
    const local = JSON.parse(localStorage.getItem('moodly_periods') || '[]');
    const idx = local.findIndex(p => p.id === id);
    if (idx >= 0) { local[idx] = { ...local[idx], ...data }; localStorage.setItem('moodly_periods', JSON.stringify(local)); }
  }
}

export async function deletePeriod(id) {
  try {
    if (!id.startsWith('local_')) {
      await deleteDoc(doc(db, 'users', DEVICE_ID, 'periods', id));
    }
    const local = JSON.parse(localStorage.getItem('moodly_periods') || '[]');
    localStorage.setItem('moodly_periods', JSON.stringify(local.filter(p => p.id !== id)));
  } catch (e) {
    console.warn('[FB] deletePeriod:', e.message);
  }
}

export async function deleteAllPeriods() {
  try {
    const snap = await getDocs(periodsRef());
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'users', DEVICE_ID, 'periods', d.id))));
    localStorage.removeItem('moodly_periods');
  } catch (e) {
    console.warn('[FB] deleteAllPeriods:', e.message);
  }
}

/* ════════════════════════════════
   NEWS CACHE
════════════════════════════════ */
export async function loadNewsCache() {
  try {
    const snap = await getDoc(newsCacheRef());
    if (snap.exists()) return snap.data();
    return null;
  } catch (e) {
    try { return JSON.parse(localStorage.getItem('moodly_nc') || 'null'); } catch { return null; }
  }
}

export async function saveNewsCache(key, arts) {
  const data = { key, arts, savedAt: serverTimestamp() };
  try {
    await setDoc(newsCacheRef(), data);
  } catch (e) {
    localStorage.setItem('moodly_nc', JSON.stringify({ key, arts }));
  }
}

/* ════════════════════════════════
   FULL DATA WIPE
════════════════════════════════ */
export async function clearAllData() {
  await Promise.all([
    deleteAllEntries(),
    deleteAllPeriods(),
    setDoc(userDocRef(), { clearedAt: serverTimestamp() }),
  ]);
  localStorage.removeItem('moodly2');
  localStorage.removeItem('moodly_periods');
  localStorage.removeItem('moodly_cycle');
  localStorage.removeItem('moodly_nc');
}

/* ════════════════════════════════
   JES MEMORY SYSTEM
   Simpan hal-hal penting yang diceritakan user
════════════════════════════════ */
const jesMemoryRef = () => doc(db, 'users', DEVICE_ID, 'cache', 'jes_memory');

export async function loadJesMemory() {
  // Cek localStorage dulu — instan
  try {
    const local = JSON.parse(localStorage.getItem('moodly_jes_mem') || 'null');
    if (local) return local;
  } catch {}
  // Fallback Firestore
  try {
    const snap = await getDoc(jesMemoryRef());
    if (snap.exists()) {
      const data = snap.data();
      localStorage.setItem('moodly_jes_mem', JSON.stringify(data));
      return data;
    }
  } catch {}
  return null;
}

export async function saveJesMemory(memory) {
  // memory = { facts: [...string], updatedAt: ISO }
  const data = { ...memory, updatedAt: new Date().toISOString() };
  localStorage.setItem('moodly_jes_mem', JSON.stringify(data));
  try {
    setDoc(jesMemoryRef(), { ...data, updatedAt: serverTimestamp() }).catch(() => {});
  } catch {}
}

export async function clearJesMemory() {
  localStorage.removeItem('moodly_jes_mem');
  try { await setDoc(jesMemoryRef(), { facts: [], updatedAt: serverTimestamp() }); } catch {}
}

export { db, DEVICE_ID };