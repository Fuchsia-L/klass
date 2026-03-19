const https = require('https');
const fs = require('fs');

const OWNER = 'Fuchsia-L';
const REPO = 'klass';
const TOKEN = process.env.GITHUB_TOKEN;
const APK = 'C:\\Users\\Fuchs\\Desktop\\klass-v1.0.0.apk';

async function main() {
  // Get release by tag
  const res = await get(`/repos/${OWNER}/${REPO}/releases/tags/v1.0.0-demo`);
  const releaseId = res.id;
  console.log('Release ID:', releaseId);

  // Upload APK using streams
  const stat = fs.statSync(APK);
  console.log(`Uploading APK (${(stat.size / 1024 / 1024).toFixed(1)} MB)...`);

  const uploadRes = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'uploads.github.com',
      path: `/repos/${OWNER}/${REPO}/releases/${releaseId}/assets?name=klass-v1.0.0-demo.apk`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': 'klass-release',
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': stat.size,
        'Accept': 'application/vnd.github+json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    
    const stream = fs.createReadStream(APK);
    stream.pipe(req);
  });

  if (uploadRes.status === 201) {
    const d = JSON.parse(uploadRes.data);
    console.log('Done:', d.browser_download_url);
  } else {
    console.error('Failed:', uploadRes.status, uploadRes.data);
  }
}

function get(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.github.com',
      path,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'User-Agent': 'klass-release',
        'Accept': 'application/vnd.github+json',
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

main().catch(console.error);
