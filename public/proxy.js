/* ═══════════════════════════════════════
   MOODLY — proxy.js
   Reverse proxy → Anthropic API + Groq API
   Jalankan: node proxy.js
   .env: ANTHROPIC_API_KEY=sk-ant-xxx
         GROQ_API_KEY=gsk_xxx (opsional)
   ═══════════════════════════════════════ */

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

const PORT             = process.env.PORT || 3001;
const ANTHROPIC_KEY    = process.env.ANTHROPIC_API_KEY;
const GROQ_KEY         = process.env.GROQ_API_KEY;

if (!ANTHROPIC_KEY) {
  console.error('❌ ANTHROPIC_API_KEY tidak ditemukan!');
  console.error('   Buat file .env dan isi: ANTHROPIC_API_KEY=sk-ant-xxxxxx');
  process.exit(1);
}

/* ── Helper: pipe request ke HTTPS ── */
function proxyToHttps(hostname, path, headers, body, res) {
  const options = {
    hostname,
    path,
    method : 'POST',
    headers: {
      'Content-Type'  : 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...headers,
    },
  };

  const req = https.request(options, r => {
    let data = '';
    r.on('data', c => data += c);
    r.on('end', () => {
      res.writeHead(r.statusCode, { 'Content-Type': 'application/json' });
      res.end(data);
    });
  });

  req.on('error', e => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: e.message }));
  });

  req.write(body);
  req.end();
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method !== 'POST')    { res.writeHead(404); res.end('Not found'); return; }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {

    /* ════════════════════════════════
       /api/anthropic  →  Anthropic API
       Dipakai oleh: news.js, nearby.js, chat.js (kalau pakai Claude)
    ════════════════════════════════ */
    if (req.url === '/api/anthropic') {
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })); return;
      }

      proxyToHttps(
        'api.anthropic.com',
        '/v1/messages',
        {
          'x-api-key'         : ANTHROPIC_KEY,
          'anthropic-version' : '2023-06-01',
          'anthropic-beta'    : 'web-search-2025-03-05',
        },
        JSON.stringify(parsed),
        res
      );
    }

    /* ════════════════════════════════
       /api/chat  →  Groq API (chat AI Jes)
    ════════════════════════════════ */
    else if (req.url === '/api/chat') {
      if (!GROQ_KEY) {
        res.writeHead(503); res.end(JSON.stringify({ error: 'GROQ_API_KEY not set' })); return;
      }
      let parsed;
      try { parsed = JSON.parse(body); } catch {
        res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })); return;
      }

      const payload = JSON.stringify({
        model      : 'llama-3.3-70b-versatile',
        max_tokens : 400,
        temperature: 0.8,
        messages   : parsed.messages,
      });

      const options = {
        hostname: 'api.groq.com',
        path    : '/openai/v1/chat/completions',
        method  : 'POST',
        headers : {
          'Content-Type'  : 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization' : `Bearer ${GROQ_KEY}`,
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
      proxyReq.on('error', e => { res.writeHead(500); res.end(JSON.stringify({ error: e.message })); });
      proxyReq.write(payload);
      proxyReq.end();
    }

    else {
      res.writeHead(404); res.end('Not found');
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Moodly proxy running → http://localhost:${PORT}`);
  console.log(`   /api/anthropic  →  Anthropic API (news, nearby)`);
  console.log(`   /api/chat       →  Groq API (AI Jes)\n`);
  if (!GROQ_KEY) console.warn('⚠️  GROQ_API_KEY tidak ditemukan — /api/chat tidak aktif');
});