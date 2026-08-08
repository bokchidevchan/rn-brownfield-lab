#!/usr/bin/env node
/**
 * 배포 제어 서버. 로컬 실험용이며 전부 더미 데이터입니다.
 *
 * 역할이 두 가지입니다.
 *
 * 1. 릴리스 저장소 흉내. /releases/<피처>/<버전>/<파일> 로 번들을 내려 줍니다.
 *    실서비스라면 이 자리가 S3 + CDN 입니다.
 * 2. 배포 관제탑. deployment.json 하나가 "지금 무엇이 배포돼 있나"의 유일한
 *    진실이고, /control 로 바꿉니다. 실서비스라면 배포 대시보드의 백엔드입니다.
 *
 * 모든 번들 다운로드를 기록합니다. 05번과 같은 이유로, "어떤 기기가 어떤
 * 버전을 받아갔나"는 로그로만 증명됩니다.
 *
 * 이 서버는 인증이 없습니다. 로컬 에뮬레이터 실험이라 그렇습니다.
 * 실서비스의 /control 에 해당하는 API 는 당연히 인증 뒤에 있어야 합니다.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4200;
const STATE_FILE = path.join(__dirname, 'deployment.json');

// 버전 → 실제 빌드 산출물 위치. v1 은 05번 것을 그대로 쓰고 v2 만 새로 빌드합니다.
// "새 버전 배포"가 앱과 무관하게 산출물 디렉토리 하나 늘리는 일이라는 것이 요점입니다.
const RELEASE_DIRS = {
  featureCart: {
    v1: path.join(__dirname, '..', '..', '05-repack-federation', 'feature-cart', 'build', 'generated'),
    v2: path.join(__dirname, '..', 'feature-cart-v2', 'build', 'generated'),
  },
};

let deployment = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
let served = [];

function saveState() {
  fs.writeFileSync(STATE_FILE, JSON.stringify(deployment, null, 2) + '\n');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);

  if (p === '/__log') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(served, null, 2));
    return;
  }
  if (p === '/__reset') {
    served = [];
    res.writeHead(200).end('ok');
    return;
  }

  // 배포 상태 조회. 클라이언트(리졸버)가 이걸 읽고 스스로 판단합니다.
  if (p === '/deployment.json') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      // 배포 상태가 캐시되면 전환이 "언젠가" 반영됩니다. 항상 새로 받게 합니다.
      // 실서비스 CDN 에서는 짧은 TTL 이 이 자리에 옵니다.
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(deployment, null, 2));
    return;
  }

  // 배포 전환. 예:
  //   curl -X POST 'localhost:4200/control?feature=featureCart&active=green'
  //   curl -X POST 'localhost:4200/control?feature=featureCart&strategy=canary&ratio=30'
  if (p === '/control' && req.method === 'POST') {
    const feature = url.searchParams.get('feature');
    const entry = deployment[feature];
    if (!entry) {
      res.writeHead(404).end('unknown feature');
      return;
    }
    const strategy = url.searchParams.get('strategy');
    const active = url.searchParams.get('active');
    const ratio = url.searchParams.get('ratio');
    const blue = url.searchParams.get('blue');
    const green = url.searchParams.get('green');
    if (strategy) entry.strategy = strategy;
    if (active) entry.active = active;
    if (ratio !== null && ratio !== undefined && ratio !== '') entry.canaryRatio = Number(ratio);
    if (blue) entry.blue = blue;
    if (green) entry.green = green;
    saveState();
    console.log('CONTROL', feature, JSON.stringify(entry));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(entry, null, 2));
    return;
  }

  // /releases/<피처>/<버전>/<플랫폼>/<파일>
  const m = p.match(/^\/releases\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  if (m) {
    const [, feature, version, platform, file] = m;
    const base = RELEASE_DIRS[feature]?.[version];
    if (!base || (platform !== 'android' && platform !== 'ios')) {
      console.log(`404  ${p} (매핑 없음)`);
      res.writeHead(404).end('not found');
      return;
    }
    const full = path.join(base, platform, path.basename(file));
    fs.readFile(full, (err, data) => {
      if (err) {
        console.log(`404  ${p}`);
        res.writeHead(404).end('not found');
        return;
      }
      served.push({ url: p, bytes: data.length, version });
      console.log(`200  ${String(data.length).padStart(8)}  ${p}`);
      res.writeHead(200, {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
    return;
  }

  res.writeHead(404).end('not found');
});

// 0.0.0.0 명시 바인딩. 05번에서 IPv6 전용으로 떴다가 에뮬레이터가 못 붙었습니다.
server.listen(PORT, '0.0.0.0', () => {
  console.log(`배포 서버: http://localhost:${PORT}`);
  console.log('상태 확인:  curl localhost:4200/deployment.json');
  console.log('블루그린:   curl -X POST "localhost:4200/control?feature=featureCart&active=green"');
  console.log('카나리:     curl -X POST "localhost:4200/control?feature=featureCart&strategy=canary&ratio=30"');
  console.log('다운로드:   curl localhost:4200/__log');
});
