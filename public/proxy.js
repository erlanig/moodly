/* ═══════════════════════════════════════
   MOODLY — proxy.js
   Local dev proxy → Groq API
   Jalankan: node proxy.js
   .env: GROQ_API_KEY=gsk_xxx
   ═══════════════════════════════════════ */

// Load .env otomatis kalau ada
try {
  require('fs').readFileSync('.env', 'utf8')
    .split('\n')
    .forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && v.length) process.env[k.trim()] = v.join('=').trim();
    });
} catch {}

const http  = require('http');
const https = require('https');

const PORT    = 3001;
const API_KEY = process.env.GROQ_API_KEY;

if (!API_KEY) {
  console.error('❌ GROQ_API_KEY tidak ditemukan!');
  console.error('   Buat file .env dan isi: GROQ_API_KEY=gsk_xxxxxx');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end(); return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })); return;
      }

      const payload = JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 400,
        temperature: 0.8,
        messages: parsed.messages,
      });

      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization': `Bearer ${API_KEY}`,
        },
      };

      const proxyReq = https.request(options, proxyRes => {
        let data = '';
        proxyRes.on('data', c => data += c);
        proxyRes.on('end', () => {
          try {
            const json  = JSON.parse(data);
            const reply = json.choices?.[0]?.message?.content?.trim() || '';
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ reply }));
          } catch {
            res.writeHead(500); res.end(JSON.stringify({ error: 'Parse error' }));
          }
        });
      });

      proxyReq.on('error', e => {
        res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
      });

      proxyReq.write(payload);
      proxyReq.end();
    });
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`✅ Moodly proxy (Groq) → http://localhost:${PORT}/api/chat`);
  console.log(`   Buka app di  http://localhost:3000\n`);
});