import { build } from 'esbuild';

/**
 * 세 비교군을 각각 번들합니다.
 *   stackflow   Stackflow 스택 네비게이션
 *   plain-spa   React 상태로 화면 교체
 *   plain-mpa   URL 마다 문서 로드
 *
 * 공용 화면(shared/screens.jsx)을 셋이 같이 쓰므로 화면 내용은 동일합니다.
 * 다른 것은 화면을 옮기는 방식뿐입니다.
 */
const result = await build({
  entryPoints: {
    stackflow: 'src/index.jsx',
    'plain-spa': 'src/plain-spa.jsx',
    'plain-mpa': 'src/plain-mpa.jsx',
  },
  outdir: 'dist',
  bundle: true,
  minify: true,
  format: 'iife',
  jsx: 'automatic',
  loader: { '.css': 'css' },
  define: { 'process.env.NODE_ENV': '"production"' },
  metafile: true,
});

for (const [f, m] of Object.entries(result.metafile.outputs)) {
  console.log(`${f} ${m.bytes} bytes`);
}
