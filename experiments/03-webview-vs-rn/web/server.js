#!/usr/bin/env node
/**
 * 웹뷰가 띄울 페이지를 서빙하는 정적 서버입니다.
 *
 * 실무 웹뷰는 대부분 원격 URL 을 엽니다. 그 조건을 그대로 재현하려고
 * assets 에서 읽는 대신 localhost:3000 을 씁니다.
 *
 * 에뮬레이터와 시뮬레이터가 호스트를 부르는 주소가 다릅니다.
 *   Android 에뮬레이터: 10.0.2.2:3000   (에뮬레이터가 호스트를 가리키는 특수 주소)
 *   iOS 시뮬레이터:     localhost:3000  (호스트와 네트워크를 공유)
 * 이 차이는 Metro 를 붙일 때와 똑같습니다.
 *
 * 실행: node web/server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const file = urlPath === '/' ? '/index.html' : urlPath;
  const full = path.join(PUBLIC_DIR, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));

  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end('not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full)] || 'application/octet-stream',
      // 캐시 조건을 측정마다 통제하려고 명시적으로 끕니다.
      // 실무에서는 여기를 켜는 것이 웹뷰 최적화의 큰 축입니다.
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`웹뷰용 페이지: http://localhost:${PORT}`);
  console.log('Android 에뮬레이터에서는 http://10.0.2.2:3000 으로 접근합니다.');
});
