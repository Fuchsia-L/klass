/**
 * Create GitHub Release + upload APK asset
 * Usage: node scripts/create-release.js
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OWNER = 'Fuchsia-L';
const REPO = 'klass';
const TAG = 'v1.0.0-demo';
const NAME = 'klass v1.0.0 Demo';
const BODY = `## klass v1.0.0 Demo

课表 + 待办管理 app（Expo + React Native）

### 功能
- 📅 课程表：日/周视图、重复事件、分类标签
- ✅ 待办：每日/每周/长期三种类型、优先级排序、详情页+备注
- 🎨 多主题系统：4 套主题可切换
- 💾 纯本地存储，无需联网

### 已知问题
- 新建事件页面滑动偶尔不流畅
- 待办完成后不下沉到底部

### 安装
下载 APK → 允许未知来源 → 安装

> Demo 版本，功能持续迭代中`;

const APK_PATH = path.resolve('C:\\Users\\Fuchs\\Desktop\\klass-v1.0.0.apk');

// Get git credential
function getToken() {
  try {
    // Try git credential fill
    const input = `protocol=https\nhost=github.com\n\n`;
    const result = execSync('echo protocol=https\nhost=github.com\n | git credential fill', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const match = result.match(/password=(.+)/);
    if (match) return match[1].trim();
  } catch {}

  // Try GITHUB_TOKEN env
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;

  throw new Error('No GitHub token found. Set GITHUB_TOKEN env var.');
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else if (typeof body === 'string') {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

async function main() {
  const token = getToken();
  console.log('Token found, creating release...');

  // 1. Create release
  const releaseRes = await request({
    hostname: 'api.github.com',
    path: `/repos/${OWNER}/${REPO}/releases`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'klass-release',
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json',
    },
  }, {
    tag_name: TAG,
    target_commitish: 'feat/settings-theme-overhaul',
    name: NAME,
    body: BODY,
    prerelease: true,
  });

  if (releaseRes.status !== 201) {
    console.error('Failed to create release:', releaseRes.status, releaseRes.data);
    process.exit(1);
  }

  const releaseId = releaseRes.data.id;
  const uploadUrl = releaseRes.data.upload_url.replace('{?name,label}', '');
  console.log(`Release created: ${releaseRes.data.html_url}`);

  // 2. Upload APK
  const apkData = fs.readFileSync(APK_PATH);
  console.log(`Uploading APK (${(apkData.length / 1024 / 1024).toFixed(1)} MB)...`);

  const uploadRes = await request({
    hostname: 'uploads.github.com',
    path: `/repos/${OWNER}/${REPO}/releases/${releaseId}/assets?name=klass-v1.0.0-demo.apk`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'klass-release',
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': apkData.length,
      'Accept': 'application/vnd.github+json',
    },
  }, apkData);

  if (uploadRes.status === 201) {
    console.log(`APK uploaded: ${uploadRes.data.browser_download_url}`);
    console.log('\nDone! Release URL:', releaseRes.data.html_url);
  } else {
    console.error('Failed to upload APK:', uploadRes.status, uploadRes.data);
  }
}

main().catch(console.error);
