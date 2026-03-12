/* ═══════════════════════════════════════
   Vercel Serverless — /api/places
   Proxy ke Google Places API (New)
═══════════════════════════════════════ */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.GOOGLE_PLACES_KEY;
  if (!apiKey) { res.status(500).json({ error: 'GOOGLE_PLACES_KEY not configured' }); return; }

  const { lat, lng, query } = req.body;
  if (!query) { res.status(400).json({ error: 'query required' }); return; }

  try {
    // Pakai Text Search (New) — support query bebas + location bias
    const body = {
      textQuery       : query,
      languageCode    : 'id',
      regionCode      : 'ID',
      maxResultCount  : 10,
      locationBias    : (lat && lng) ? {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 30000, // 30km radius
        }
      } : undefined,
    };

    const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method : 'POST',
      headers: {
        'Content-Type'     : 'application/json',
        'X-Goog-Api-Key'   : apiKey,
        // Field mask — hanya ambil field yang dibutuhkan (hemat biaya)
        'X-Goog-FieldMask' : [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.rating',
          'places.userRatingCount',
          'places.nationalPhoneNumber',
          'places.websiteUri',
          'places.regularOpeningHours',
          'places.priceLevel',
          'places.types',
          'places.shortFormattedAddress',
          'places.businessStatus',
        ].join(','),
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('[places] Google error:', JSON.stringify(data));
      res.status(upstream.status).json({ error: data.error?.message || 'Google API error' });
      return;
    }

    res.status(200).json(data);
  } catch (e) {
    console.error('[places] fetch error:', e.message);
    res.status(502).json({ error: e.message });
  }
}