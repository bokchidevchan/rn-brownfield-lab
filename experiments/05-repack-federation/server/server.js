#!/usr/bin/env node
/**
 * 원격 번들 서버.
 *
 * 단순히 파일을 내려주는 게 전부지만, 요청을 전부 로그로 남깁니다.
 * 그게 이 실험의 측정 도구입니다.
 *
 * "피처 번들에서 react-native 를 뺐다"는 주장은 빌드 산출물 크기만 봐서는
 * 확인이 안 됩니다. 폴백 청크가 같이 만들어지기 때문입니다.
 * 런타임에 실제로 무엇을 받아 갔는지를 봐야 합니다.
 *
 * 실행: node server/server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4100;
/**
 * Re.Pack 의 bundle 명령은 `--bundle-output` 으로 준 경로에 엔트리 번들만 놓고,
 * 나머지 청크와 mf-manifest.json 은 `--assets-dest` 쪽 generated/<platform>/ 에 놓습니다.
 * 원격 번들에서 정작 필요한 것은 후자입니다.
 *
 * URL 의 원격 이름을 피처 디렉토리로 매핑합니다. 실서비스라면 이 자리가
 * CDN 의 경로 규칙(팀별 버킷 등)이 됩니다.
 */
const FEATURE_DIRS = {
  featureCart: 'feature-cart',
  featureProfile: 'feature-profile',
};

function rootFor(platform, featureName) {
  if (platform !== 'android' && platform !== 'ios') return null;
  const dir = FEATURE_DIRS[featureName];
  if (!dir) return null;
  return path.join(__dirname, '..', dir, 'build', 'generated', platform);
}

let served = [];

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath === '/__log') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(served, null, 2));
    return;
  }
  if (urlPath === '/__reset') {
    served = [];
    res.writeHead(200).end('ok');
    return;
  }

  // /<플랫폼>/<원격이름>/<파일>  ->  <피처 디렉토리>/build/generated/<플랫폼>/<파일>
  const m = urlPath.match(/^\/([^/]+)\/([^/]+)\/(.+)$/);
  const root = m && rootFor(m[1], m[2]);
  if (!root) {
    console.log(`404  ${urlPath} (매핑 없음)`);
    res.writeHead(404).end('not found');
    return;
  }
  const full = path.join(root, path.basename(m[3]));

  fs.readFile(full, (err, data) => {
    if (err) {
      console.log(`404  ${urlPath}`);
      res.writeHead(404).end('not found');
      return;
    }
    served.push({ url: urlPath, bytes: data.length });
    console.log(`200  ${String(data.length).padStart(8)}  ${urlPath}`);
    res.writeHead(200, {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

// 0.0.0.0 명시 바인딩. 기본값(IPv6 와일드카드)으로 두면 에뮬레이터의
// 10.0.2.2 NAT 가 IPv4 로만 붙는 환경에서 연결이 조용히 실패할 수 있습니다.
server.listen(PORT, '0.0.0.0', () => {
  console.log(`원격 번들 서버: http://localhost:${PORT}`);
  console.log(`서빙 피처: ${Object.keys(FEATURE_DIRS).join(', ')}`);
  console.log('에뮬레이터에서는 http://10.0.2.2:4100 으로 접근합니다.');
  console.log('실제로 내려간 것 확인: curl localhost:4100/__log');
});
