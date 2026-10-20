/* ═══════════════════════════════════════
   MOODLY — api/reminder.js
   Vercel Serverless Function → Google OAuth (Gmail API) Automation
   ═══════════════════════════════════════ */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const DEFAULT_EMAIL = process.env.REMINDER_TO_EMAIL || 'erlanigwork@gmail.com';

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to exchange refresh token');
  }
  return data.access_token;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const {
    action = 'send_email',
    to = DEFAULT_EMAIL,
    title = 'Pengingat Moodly',
    note = '',
    datetime = '',
    category = 'Self-care',
    reminders = [],
    userName = 'Sahabat Moodly',
  } = req.body || {};

  try {
    const accessToken = await getAccessToken();

    if (action === 'test_connection') {
      const profRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profData = await profRes.json();
      return res.status(200).json({ success: true, profile: profData });
    }

    if (action === 'send_email') {
      const emailSubject = `💖 Pengingat Moodly: ${title}`;
      const utf8Subject = `=?UTF-8?B?${Buffer.from(emailSubject).toString('base64')}?=`;

      const categoryColors = {
        'Self-care': '#ff2d55',
        'Kesehatan': '#34c759',
        'Tugas': '#007aff',
        'Refleksi': '#af52de',
        'Ibadah': '#ff9500',
      };
      const catColor = categoryColors[category] || '#ff2d55';

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin:0; padding:0; background:#f5f5f7; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
    .card { max-width:520px; margin:24px auto; background:#ffffff; border-radius:24px; padding:32px 28px; border:1px solid #ffe4eb; box-shadow:0 8px 30px rgba(0,0,0,0.06); }
    .badge { display:inline-block; padding:4px 12px; background:${catColor}15; color:${catColor}; border-radius:20px; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
    .title { font-size:22px; font-weight:700; color:#1d1d1f; margin:14px 0 6px 0; }
    .date-badge { color:#86868b; font-size:13px; margin-bottom:18px; }
    .note-box { background:#fff5f8; border-left:4px solid ${catColor}; border-radius:14px; padding:16px 18px; color:#3a3a3c; font-size:14px; line-height:1.6; margin:16px 0; }
    .footer { font-size:12px; color:#86868b; text-align:center; margin-top:28px; border-top:1px solid #f2f2f7; padding-top:16px; }
    .logo { color:#ff2d55; font-size:16px; font-weight:800; letter-spacing:-0.5px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <span class="logo">moodly</span>
      <span class="badge">${category}</span>
    </div>

    <div class="title">${title}</div>
    ${datetime ? `<div class="date-badge">📅 Jadwal: <b>${datetime}</b></div>` : ''}

    <div class="note-box">
      <strong>Catatan & Detail:</strong><br>
      ${note ? note.replace(/\n/g, '<br>') : 'Jangan lupa untuk meluangkan waktu sejenak merawat dirimu hari ini.'}
    </div>

    <p style="font-size:13px; color:#86868b; line-height:1.5;">
      Halo <b>${userName}</b>! Kesehatan mental dan fisikmu adalah prioritas nomor satu. Selesaikan tugas atau istirahatlah dengan tenang ya.
    </p>

    <div class="footer">
      Pengingat otomatis dari <b>Moodly App</b> · Selalu menemani hari-harimu 🌸
    </div>
  </div>
</body>
</html>`;

      const rawMsg = [
        `From: Moodly <erlanigwork@gmail.com>`,
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        htmlBody,
      ].join('\r\n');

      const encoded = Buffer.from(rawMsg)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      });

      const sendData = await sendRes.json();
      if (!sendRes.ok) {
        return res.status(sendRes.status).json({ error: sendData });
      }

      return res.status(200).json({
        success: true,
        messageId: sendData.id,
        to,
        title,
      });
    }

    if (action === 'send_summary') {
      const emailSubject = `📋 Agenda & Pengingat Harian Moodly (${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })})`;
      const utf8Subject = `=?UTF-8?B?${Buffer.from(emailSubject).toString('base64')}?=`;

      const itemsHtml = reminders.map((r, i) => `
        <div style="padding:12px 14px; background:#f9f9fb; border-radius:12px; margin-bottom:8px; border:1px solid #ebebf0;">
          <div style="font-weight:600; color:#1d1d1f; font-size:14px;">${i + 1}. ${r.title} ${r.done ? '✓ (Selesai)' : ''}</div>
          ${r.datetime ? `<div style="font-size:12px; color:#86868b; margin-top:2px;">🕒 ${r.datetime} · [${r.category || 'Umum'}]</div>` : ''}
          ${r.note ? `<div style="font-size:13px; color:#505055; margin-top:4px;">${r.note}</div>` : ''}
        </div>
      `).join('');

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { margin:0; padding:0; background:#f5f5f7; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
    .card { max-width:520px; margin:24px auto; background:#ffffff; border-radius:24px; padding:32px 28px; border:1px solid #ffe4eb; box-shadow:0 8px 30px rgba(0,0,0,0.06); }
    .title { font-size:22px; font-weight:700; color:#1d1d1f; margin:14px 0 6px 0; }
    .logo { color:#ff2d55; font-size:16px; font-weight:800; letter-spacing:-0.5px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <span class="logo">moodly</span>
      <span style="font-size:12px; color:#86868b;">Daily Automation</span>
    </div>
    <div class="title">Ringkasan Agenda Hari Ini</div>
    <p style="color:#86868b; font-size:13px;">Berikut adalah daftar tugas & pengingat yang tersimpan di Moodly kamu:</p>
    
    <div style="margin:20px 0;">
      ${itemsHtml || '<div style="color:#86868b; font-size:13px;">Tidak ada agenda yang tersimpan.</div>'}
    </div>

    <div style="font-size:12px; color:#86868b; text-align:center; margin-top:28px; border-top:1px solid #f2f2f7; padding-top:16px;">
      Moodly Automation · Terkirim langsung ke ${to}
    </div>
  </div>
</body>
</html>`;

      const rawMsg = [
        `From: Moodly <erlanigwork@gmail.com>`,
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        '',
        htmlBody,
      ].join('\r\n');

      const encoded = Buffer.from(rawMsg)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      });

      const sendData = await sendRes.json();
      return res.status(200).json({ success: true, messageId: sendData.id });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('[Reminder API Error]', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
