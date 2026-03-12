/* ═══════════════════════════════════════
   Vercel Serverless — /api/places.js
   Pakai Overpass API (OpenStreetMap) — GRATIS, no API key
═══════════════════════════════════════ */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { lat, lng } = req.body || {};

  // Default ke Jakarta kalau tidak ada koordinat
  const centerLat = parseFloat(lat) || -6.2088;
  const centerLng = parseFloat(lng) || 106.8456;
  const radius    = 10000; // 10km

  // Query Overpass — cari semua fasilitas kesehatan mental di sekitar koordinat
  const overpassQuery = `
    [out:json][timeout:25];
    (
      node["amenity"="doctors"]["healthcare:speciality"="psychiatry"](around:${radius},${centerLat},${centerLng});
      node["amenity"="doctors"]["healthcare:speciality"="psychology"](around:${radius},${centerLat},${centerLng});
      node["amenity"="clinic"]["healthcare"~"mental|psychiatry|psychology",i](around:${radius},${centerLat},${centerLng});
      node["amenity"="hospital"]["healthcare:speciality"~"psychiatry|mental",i](around:${radius},${centerLat},${centerLng});
      node["healthcare"="psychologist"](around:${radius},${centerLat},${centerLng});
      node["healthcare"="psychiatrist"](around:${radius},${centerLat},${centerLng});
      node["amenity"~"clinic|hospital"]["name"~"jiwa|mental|psikolog|psikiater|kesehatan jiwa",i](around:${radius},${centerLat},${centerLng});
      way["amenity"~"clinic|hospital"]["name"~"jiwa|mental|psikolog|psikiater|kesehatan jiwa",i](around:${radius},${centerLat},${centerLng});
    );
    out body center 20;
  `;

  try {
    const upstream = await fetch('https://overpass-api.de/api/interpreter', {
      method : 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body   : 'data=' + encodeURIComponent(overpassQuery),
    });

    if (!upstream.ok) throw new Error('overpass_http_' + upstream.status);

    const data = await upstream.json();
    res.status(200).json({ elements: data.elements || [] });

  } catch (e) {
    console.error('[places] error:', e.message);
    res.status(502).json({ error: e.message, elements: [] });
  }
}