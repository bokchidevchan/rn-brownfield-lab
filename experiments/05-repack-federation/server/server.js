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
 * 원격 번들에서 정작 필요한 것은 후자입니다. 여기를 서빙 루트로 잡습니다.
 */
const ROOT = path.join(
  __dirname, '..', 'feature-cart', 'build', 'generated', 'android',
);

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

  // /android/featureCart/xxx  ->  <ROOT>/xxx
  const full = path.join(ROOT, path.basename(urlPath));

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
  console.log(`서빙 루트: ${ROOT}`);
  console.log('에뮬레이터에서는 http://10.0.2.2:4100 으로 접근합니다.');
  console.log('실제로 내려간 것 확인: curl localhost:4100/__log');
});
