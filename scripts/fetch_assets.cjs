const fs = require('fs');
const path = require('path');
const https = require('https');

const outDir = path.join(__dirname, '..', 'public', 'img', '3d');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function downloadHttp(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadHttp(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: status ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', reject);
  });
}

function extractFrom3dicons(componentName, destFileName) {
  const url = `https://unpkg.com/@nobertdev/react-3d-icons@1.5.2/dist/_/front-color/${componentName}.js`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return extractFrom3dicons(res.headers.location, destFileName).then(resolve).catch(reject);
      }
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        const match = raw.match(/const s = "data:image\/png;base64,([^"]+)"/);
        if (match && match[1]) {
          const buf = Buffer.from(match[1], 'base64');
          fs.writeFileSync(path.join(outDir, destFileName), buf);
          console.log(`Saved 3dicon: ${destFileName} (${buf.length} bytes)`);
          resolve();
        } else {
          console.warn(`Could not extract base64 for ${componentName}`);
          resolve();
        }
      });
    }).on('error', reject);
  });
}

const fluentEmojis = [
  { name: 'mood-happy.png', path: 'Grinning%20face%20with%20big%20eyes/3D/grinning_face_with_big_eyes_3d.png' },
  { name: 'mood-oke.png', path: 'Smiling%20face%20with%20smiling%20eyes/3D/smiling_face_with_smiling_eyes_3d.png' },
  { name: 'mood-biasa.png', path: 'Neutral%20face/3D/neutral_face_3d.png' },
  { name: 'mood-sedih.png', path: 'Pensive%20face/3D/pensive_face_3d.png' },
  { name: 'mood-anxious.png', path: 'Anxious%20face%20with%20sweat/3D/anxious_face_with_sweat_3d.png' },
  { name: 'mood-frustrasi.png', path: 'Pouting%20face/3D/pouting_face_3d.png' },
  { name: 'mood-exhausted.png', path: 'Tired%20face/3D/tired_face_3d.png' },
  { name: 'mood-burnout.png', path: 'Melting%20face/3D/melting_face_3d.png' },
];

const threeDIcons = [
  { comp: 'Heart', file: '3d-heart.png' },
  { comp: 'Star', file: '3d-star.png' },
  { comp: 'Sun', file: '3d-sun.png' },
  { comp: 'Fire', file: '3d-fire.png' },
  { comp: 'Calendar', file: '3d-calendar.png' },
  { comp: 'Clock', file: '3d-clock.png' },
  { comp: 'Tick', file: '3d-tick.png' },
  { comp: 'ChatBubble', file: '3d-chat.png' },
  { comp: 'Trophy', file: '3d-trophy.png' },
  { comp: 'Target', file: '3d-target.png' },
  { comp: 'Shield', file: '3d-shield.png' },
  { comp: 'Notebook', file: '3d-book.png' },
  { comp: 'Bulb', file: '3d-bulb.png' },
  { comp: 'Bell', file: '3d-bell.png' },
  { comp: 'Moon', file: '3d-moon.png' },
  { comp: 'TeaCup', file: '3d-cup.png' },
  { comp: 'Umbrella', file: '3d-umbrella.png' },
];

async function main() {
  console.log('Downloading 3D Mood Emojis...');
  for (const item of fluentEmojis) {
    const url = `https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@latest/assets/${item.path}`;
    const dest = path.join(outDir, item.name);
    try {
      await downloadHttp(url, dest);
      console.log(`Downloaded ${item.name}`);
    } catch (err) {
      console.error(`Error downloading ${item.name}:`, err.message);
    }
  }

  console.log('Extracting 3dicons.co Assets...');
  for (const item of threeDIcons) {
    try {
      await extractFrom3dicons(item.comp, item.file);
    } catch (err) {
      console.error(`Error extracting ${item.comp}:`, err.message);
    }
  }

  console.log('Done downloading 3D assets!');
}

main();
