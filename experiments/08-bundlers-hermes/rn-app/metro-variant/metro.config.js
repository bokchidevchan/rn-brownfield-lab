const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * RN 0.72 부터 metro.config.js 는 @react-native/metro-config 의 기본값을
 * 확장해야 합니다. RN 특유의 처리(Flow 타입 제거, 플랫폼 확장자,
 * 에셋 해석)가 전부 그 기본값에 들어 있습니다.
 */
const fs = require('fs');
const path = require('path');

// node_modules 가 05 실험 것을 가리키는 심링크라, Metro 의 파일 맵이
// 실제 경로를 크롤하도록 알려 줘야 합니다. 모노레포에서 흔한 설정입니다.
const sharedNodeModules = fs.realpathSync(path.join(__dirname, 'node_modules'));

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [sharedNodeModules],
  resolver: {
    nodeModulesPaths: [sharedNodeModules],
  },
});
