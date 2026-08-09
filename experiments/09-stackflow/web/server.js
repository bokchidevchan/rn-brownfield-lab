#!/usr/bin/env node
/**
 * 세 비교군을 한 서버에서 서빙합니다. 로컬 실험용입니다.
 *
 *   /             선택 화면
 *   /plain-mpa/*  URL 마다 문서 로드
 *   /plain-spa/*  React 상태 라우팅
 *   /stackflow/*  Stackflow 스택
 *
 * 요청을 전부 기록합니다. 이 실험의 측정 도구가 그 로그입니다.
 * 화면을 옮길 때 요청이 늘어나는지 아닌지가 세 방식의 첫 번째 차이입니다.
 *
 * 기본 포트는 4300 입니다. 03 번의 웹뷰 앱으로 열어 보려면 PORT=3000 으로
 * 띄웁니다. 그 앱의 WebViewActivity 가 exported 가 아니라 adb 로 직접 못 여는데,
 * 기본 주소인 10.0.2.2:3000 을 그대로 쓰면 앱 수정 없이 바꿔치기됩니다.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT ?? 4300);
const DIST = path.join(__dirname, 'dist');
const PUBLIC = path.join(__dirname, 'public');

const SHELL = fs.readFileSync(path.join(PUBLIC, 'shell.html'), 'utf-8');

const VARIANTS = {
  'plain-mpa': { title: 'plain MPA', css: false },
  'plain-spa': { title: 'plain SPA', css: false },
  stackflow: { title: 'Stackflow', css: true },
};

let served = [];

const TYPES = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html' };

function shellFor(name) {
  const v = VARIANTS[name];
  return SHELL
    .replace('__TITLE__', v.title)
    .replace('__CSS__', v.css ? `<link rel="stylesheet" href="/${name}.css" />` : '')
    .replace('__JS__', `/${name}.js`);
}

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

  const send = (body, type, label) => {
    served.push({ url: urlPath, kind: label, bytes: body.length });
    console.log(`200  ${String(body.length).padStart(7)}  ${label.padEnd(8)}  ${urlPath}`);
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
  };

  // 정적 산출물 (번들과 CSS)
  const asset = path.join(DIST, urlPath);
  if (urlPath !== '/' && fs.existsSync(asset) && fs.statSync(asset).isFile()) {
    send(fs.readFileSync(asset), TYPES[path.extname(asset)] ?? 'text/plain', 'asset');
    return;
  }

  // 각 비교군의 문서. 하위 경로는 전부 같은 셸을 줍니다.
  // plain-mpa 는 이 경로로 매번 새로 들어오고, 나머지 둘은 처음 한 번만 들어옵니다.
  const variant = Object.keys(VARIANTS).find(
    name => urlPath === `/${name}` || urlPath.startsWith(`/${name}/`),
  );
  if (variant) {
    send(Buffer.from(shellFor(variant)), 'text/html', 'document');
    return;
  }

  send(fs.readFileSync(path.join(PUBLIC, 'index.html')), 'text/html', 'index');
});

// 0.0.0.0 명시. 05 번에서 IPv6 전용 바인딩 때문에 에뮬레이터가 못 붙었습니다.
server.listen(PORT, '0.0.0.0', () => {
  console.log(`비교 데모: http://localhost:${PORT}`);
  console.log(`에뮬레이터에서는 http://10.0.2.2:${PORT}`);
  console.log(`받아 간 것 확인: curl localhost:${PORT}/__log`);
});
