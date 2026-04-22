/* ═══════════════════════════════════════
   MOODLY — firebase.js
   Firebase init + all Firestore operations
   ═══════════════════════════════════════ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  doc, collection,
  getDoc, getDocs, setDoc, addDoc, deleteDoc, updateDoc,
  query, orderBy, serverTimestamp,
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

const firebaseApp = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(firebaseApp);

function getDeviceId() {
  let id = localStorage.getItem('moodly_device_id');
  if (!id) {
    id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
    localStorage.setItem('moodly_device_id', id);
  }
  return id;
}
const DEVICE_ID = getDeviceId();

const userDocRef   = () => doc(db, 'users', DEVICE_ID);
const entriesRef   = () => collection(db, 'users', DEVICE_ID, 'entries');
const periodsRef   = () => collection(db, 'users', DEVICE_ID, 'periods');
const newsCacheRef = () => doc(db, 'users', DEVICE_ID, 'cache', 'news');
const foodCacheRef = () => doc(db, 'users', DEVICE_ID, 'cache', 'food_ai');
const aiPredRef    = () => doc(db, 'users', DEVICE_ID, 'cache', 'ai_prediction');
const jesMemRef    = () => doc(db, 'users', DEVICE_ID, 'cache', 'jes_memory');

/* ════════════════ STATUS ════════════════ */
let _syncOk = false;
export function isSynced() { return _syncOk; }
export async function checkConnection() {
  try { await getDoc(userDocRef()); _syncOk = true; return true; }
  catch { _syncOk = false; return false; }
}

/* ════════════════ PROFILE ════════════════ */
export async function loadProfile() {
  try { const s = await getDoc(userDocRef()); return s.exists() ? s.data() : null; }
  catch (e) { console.warn('[FB] loadProfile:', e.message); return null; }
}
export async function saveProfile(data) {
  try { await setDoc(userDocRef(), { ...data, updatedAt: serverTimestamp() }, { merge: true }); _syncOk = true; }
  catch (e) { _syncOk = false; localStorage.setItem('moodly_profile_local', JSON.stringify(data)); }
}

/* ════════════════ ENTRIES ════════════════ */
export async function loadEntries() {
  try {
    const snap = await getDocs(query(entriesRef(), orderBy('ts', 'asc')));
    _syncOk = true;
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    _syncOk = false;
    try { return JSON.parse(localStorage.getItem('moodly2') || '[]'); } catch { return []; }
  }
}
export async function addEntry(entry) {
  try {
    const ref = await addDoc(entriesRef(), { ...entry, ts: entry.ts || new Date().toISOString(), createdAt: serverTimestamp() });
    _syncOk = true; return ref.id;
  } catch (e) {
    _syncOk = false;
    const local = JSON.parse(localStorage.getItem('moodly2') || '[]');
    local.push(entry); localStorage.setItem('moodly2', JSON.stringify(local)); return null;
  }
}
export async function deleteAllEntries() {
  try {
    const snap = await getDocs(entriesRef());
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'users', DEVICE_ID, 'entries', d.id))));
  } catch {}
}

/* ════════════════ PERIODS ════════════════ */
export async function loadPeriods() {
  try {
    const snap = await getDocs(query(periodsRef(), orderBy('startDate', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    try { return JSON.parse(localStorage.getItem('moodly_periods') || '[]'); } catch { return []; }
  }
}
export async function addPeriod(period) {
  try {
    const ref = await addDoc(periodsRef(), { ...period, createdAt: serverTimestamp() });
    _syncOk = true; return ref.id;
  } catch (e) {
    const local = JSON.parse(localStorage.getItem('moodly_periods') || '[]');
    const withId = { ...period, id: 'local_' + Date.now() };
    local.unshift(withId); localStorage.setItem('moodly_periods', JSON.stringify(local));
    return withId.id;
  }
}
export async function updatePeriod(id, data) {
  try {
    if (!id.startsWith('local_')) await updateDoc(doc(db, 'users', DEVICE_ID, 'periods', id), data);
  } catch {}
  const local = JSON.parse(localStorage.getItem('moodly_periods') || '[]');
  const idx = local.findIndex(p => p.id === id);
  if (idx >= 0) { local[idx] = { ...local[idx], ...data }; localStorage.setItem('moodly_periods', JSON.stringify(local)); }
}
export async function deletePeriod(id) {
  try { if (!id.startsWith('local_')) await deleteDoc(doc(db, 'users', DEVICE_ID, 'periods', id)); } catch {}
  const local = JSON.parse(localStorage.getItem('moodly_periods') || '[]');
  localStorage.setItem('moodly_periods', JSON.stringify(local.filter(p => p.id !== id)));
}
export async function deleteAllPeriods() {
  try {
    const snap = await getDocs(periodsRef());
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'users', DEVICE_ID, 'periods', d.id))));
  } catch {}
  localStorage.removeItem('moodly_periods');
}

/* ════════════════ PERIOD DAILY LOGS ════════════════ */
const periodDaysRef   = (pid) => collection(db, 'users', DEVICE_ID, 'periods', pid, 'days');
const periodDayDocRef = (pid, date) => doc(db, 'users', DEVICE_ID, 'periods', pid, 'days', date);

export async function loadPeriodDays(periodId) {
  if (!periodId) return [];
  const k = `moodly_pdays_${periodId}`;
  try {
    if (periodId.startsWith('local_')) return JSON.parse(localStorage.getItem(k) || '[]');
    const snap = await getDocs(periodDaysRef(periodId));
    const data = snap.docs.map(d => ({ date: d.id, ...d.data() }));
    localStorage.setItem(k, JSON.stringify(data));
    return data;
  } catch {
    try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
  }
}
export async function savePeriodDay(periodId, date, data) {
  if (!periodId || !date) return;
  const k = `moodly_pdays_${periodId}`;
  const local = JSON.parse(localStorage.getItem(k) || '[]');
  const idx = local.findIndex(d => d.date === date);
  const item = { date, ...data };
  if (idx >= 0) local[idx] = item; else local.push(item);
  localStorage.setItem(k, JSON.stringify(local));
  try {
    if (!periodId.startsWith('local_'))
      await setDoc(periodDayDocRef(periodId, date), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  } catch {}
}

/* ════════════════ AI PREDICTION CACHE ════════════════ */
export async function loadAIPredCache() {
  try {
    const local = JSON.parse(localStorage.getItem('moodly_ai_pred') || 'null');
    if (local) return local;
    const snap = await getDoc(aiPredRef());
    if (snap.exists()) { const d = snap.data(); localStorage.setItem('moodly_ai_pred', JSON.stringify(d)); return d; }
  } catch {}
  return null;
}
export async function saveAIPredCache(data) {
  const item = { ...data, savedAt: new Date().toISOString() };
  localStorage.setItem('moodly_ai_pred', JSON.stringify(item));
  try { setDoc(aiPredRef(), { ...item, savedAt: serverTimestamp() }).catch(() => {}); } catch {}
}

/* ════════════════ FOOD / AI CACHE ════════════════ */
export async function loadFoodCache() {
  try {
    const local = JSON.parse(localStorage.getItem('moodly_food_cache') || 'null');
    if (local) return local;
    const snap = await getDoc(foodCacheRef());
    if (snap.exists()) { const d = snap.data(); localStorage.setItem('moodly_food_cache', JSON.stringify(d)); return d; }
  } catch {}
  return null;
}
export async function saveFoodCache(phase, items, drinks, motivasi) {
  const data = { phase, items, drinks, motivasi, date: new Date().toDateString(), savedAt: new Date().toISOString() };
  localStorage.setItem('moodly_food_cache', JSON.stringify(data));
  try { setDoc(foodCacheRef(), { ...data, savedAt: serverTimestamp() }).catch(() => {}); } catch {}
}

/* ════════════════ NEWS CACHE ════════════════ */
export async function loadNewsCache() {
  try { const s = await getDoc(newsCacheRef()); return s.exists() ? s.data() : null; }
  catch { try { return JSON.parse(localStorage.getItem('moodly_nc') || 'null'); } catch { return null; } }
}
export async function saveNewsCache(key, arts) {
  try { await setDoc(newsCacheRef(), { key, arts, savedAt: serverTimestamp() }); }
  catch { localStorage.setItem('moodly_nc', JSON.stringify({ key, arts })); }
}

/* ════════════════ FULL WIPE ════════════════ */
export async function clearAllData() {
  await Promise.all([deleteAllEntries(), deleteAllPeriods(), setDoc(userDocRef(), { clearedAt: serverTimestamp() })]);
  ['moodly2','moodly_periods','moodly_cycle','moodly_nc','moodly_food_cache','moodly_ai_pred']
    .forEach(k => localStorage.removeItem(k));
  Object.keys(localStorage).filter(k => k.startsWith('moodly_pdays_')).forEach(k => localStorage.removeItem(k));
}

/* ════════════════ JES MEMORY ════════════════ */
export async function loadJesMemory() {
  try { const l = JSON.parse(localStorage.getItem('moodly_jes_mem') || 'null'); if (l) return l; } catch {}
  try { const s = await getDoc(jesMemRef()); if (s.exists()) { const d = s.data(); localStorage.setItem('moodly_jes_mem', JSON.stringify(d)); return d; } } catch {}
  return null;
}
export async function saveJesMemory(memory) {
  const data = { ...memory, updatedAt: new Date().toISOString() };
  localStorage.setItem('moodly_jes_mem', JSON.stringify(data));
  try { setDoc(jesMemRef(), { ...data, updatedAt: serverTimestamp() }).catch(() => {}); } catch {}
}
export async function clearJesMemory() {
  localStorage.removeItem('moodly_jes_mem');
  try { await setDoc(jesMemRef(), { facts: [], updatedAt: serverTimestamp() }); } catch {}
}

export { db, DEVICE_ID };