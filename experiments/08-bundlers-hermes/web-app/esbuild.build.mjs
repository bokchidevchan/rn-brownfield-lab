import { build } from 'esbuild';

/**
 * esbuild 쪽 설정. 이게 전부입니다.
 *
 * JSX 파싱, 트리 셰이킹, 코드 스플리팅, 압축이 전부 내장이라
 * 로더 체인이 없습니다. 빠른 이유이자, 세밀한 변환(예: RN 의 Flow 타입
 * 제거, 특수한 babel 플러그인)을 끼우기 어려운 이유이기도 합니다.
 */
await build({
  entryPoints: ['src/index.jsx'],
  outdir: 'dist-esbuild',
  bundle: true,
  minify: true,
  splitting: true,
  format: 'esm',
  jsx: 'automatic',
  entryNames: 'main',
  chunkNames: '[name]-[hash]',
});
console.log('esbuild done');
