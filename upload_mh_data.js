/**
 * MOODLY — upload_mh_data.js  (Node v24 compatible)
 * Jalankan sekali: node upload_mh_data.js
 */

import admin from 'firebase-admin';
import { createReadStream, readFileSync } from 'fs';
import { parse } from 'csv-parse';

// Node v24 tidak support "import ... assert { type:'json' }"
// Ganti nama file di bawah sesuai service account key kamu
const serviceAccount = JSON.parse(
  readFileSync('./moodly-26-firebase-adminsdk-fbsvc-d74fb40740.json', 'utf8')
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db         = admin.firestore();
const COLLECTION = 'mental_health_services';
const BATCH_SIZE = 400;

function cleanRow(row) {
  return {
    id             : parseInt(row.id),
    provinsi       : row.provinsi || '',
    kabupaten_kota : row.kabupaten_kota || '',
    nama_layanan   : row.nama_layanan || '',
    jenis_layanan  : row.jenis_layanan || '',
    kategori       : row.kategori || '',
    specialization : row.specialization || '',
    alamat         : row.alamat || '',
    telepon        : row.telepon || null,
    website        : row.website || null,
    lat            : parseFloat(row.latitude)  || 0,
    lng            : parseFloat(row.longitude) || 0,
    telemedicine   : row.telemedicine === 'True',
    biaya_mulai    : parseInt(row.biaya_mulai) || 0,
    insurance      : row.insurance_supported
                       ? row.insurance_supported.split(',').map(s => s.trim())
                       : [],
    rating         : parseFloat(row.rating) || 0,
    jam_buka       : row.jam_buka  || '',
    jam_tutup      : row.jam_tutup || '',
    hari           : row.hari_operasional || '',
    verified       : row.verified === 'True',
  };
}

async function uploadInBatches(rows) {
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const row of chunk) {
      const ref = db.collection(COLLECTION).doc(String(row.id));
      batch.set(ref, row);
    }
    await batch.commit();
    total += chunk.length;
    console.log(`✅ Uploaded ${total}/${rows.length}...`);
  }
}

async function main() {
  console.log('📂 Reading mh_ind.csv...');
  const rows = [];

  await new Promise((resolve, reject) => {
    createReadStream('./mh_ind.csv')
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', row => rows.push(cleanRow(row)))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`📊 Total rows: ${rows.length}`);
  console.log('🚀 Uploading to Firestore collection: mental_health_services');
  await uploadInBatches(rows);
  console.log('🎉 Done!');
  process.exit(0);
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1); });