import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

/**
 * 두 번들이 실제로 실행되고 화면을 그리는지 헤드리스로 확인합니다.
 * 브라우저 없이 jsdom 위에서 번들을 실행하고, 앱이 그린 제목 텍스트를
 * 어설션합니다. "빌드가 됐다"와 "돌아간다"는 다른 문제라서 필요합니다.
 */

async function smoke(name, htmlScript) {
  const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`, {
    runScripts: 'dangerously',
    url: 'http://localhost/',
    pretendToBeVisual: true,
  });

  const el = dom.window.document.createElement('script');
  if (htmlScript.type) {
    el.type = htmlScript.type;
  }
  el.textContent = htmlScript.code;
  dom.window.document.body.appendChild(el);

  await new Promise(r => setTimeout(r, 300));
  const title = dom.window.document.querySelector('[data-testid="title"]');
  if (!title || !title.textContent.includes('번들러 비교 데모')) {
    throw new Error(`${name}: 렌더 실패`);
  }
  console.log(`${name}: 렌더 확인 (제목 "${title.textContent}")`);
}

// webpack 산출물은 고전적인 IIFE 라 그대로 실행됩니다.
await smoke('webpack', {
  code: fs.readFileSync(path.resolve('dist-webpack/main.js'), 'utf-8'),
});

// esbuild 산출물은 splitting 때문에 ESM 입니다. jsdom 은 모듈 스크립트를
// 지원하지 않으므로, splitting 없는 IIFE 판을 하나 더 만들어 검증합니다.
// (브라우저에서는 <script type="module"> 로 그대로 동작합니다)
import { build } from 'esbuild';
const iife = await build({
  entryPoints: ['src/index.jsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  jsx: 'automatic',
  write: false,
});
await smoke('esbuild(iife 검증판)', { code: iife.outputFiles[0].text });
