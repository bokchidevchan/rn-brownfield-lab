const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * 브라운필드에서도 Metro 설정 자체는 그린필드와 같습니다.
 * 다른 점은 번들을 누가 언제 가져가느냐입니다.
 *
 * - 개발: 네이티브 호스트가 http://localhost:8081 의 Metro 에 붙습니다.
 *   기기에서 돌릴 때는 `adb reverse tcp:8081 tcp:8081` 이 필요합니다.
 * - 릴리스: `npm run bundle:android` / `npm run bundle:ios` 로 미리 뽑아
 *   네이티브 빌드 산출물에 포함시킵니다. android/app/build.gradle 의 react {} 블록이
 *   릴리스 빌드에서 이 작업을 자동으로 걸어 둡니다.
 */
module.exports = mergeConfig(getDefaultConfig(__dirname), {});
