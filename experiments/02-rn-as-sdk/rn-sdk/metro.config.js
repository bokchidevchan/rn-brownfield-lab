const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * SDK 로 빼면서 달라지는 점이 하나 있습니다.
 *
 * 01 번에서는 릴리스 빌드 때 Gradle 의 react {} 블록이 번들을 알아서 뽑아 줬습니다.
 * 여기서는 소비 앱이 RN Gradle 플러그인을 쓰지 않으므로 그 자동화가 없습니다.
 * SDK 를 배포하기 전에 `npm run bundle:android` 를 직접 돌려서 결과물을
 * android/rnsdk/src/main/assets/ 에 넣어 둬야 합니다.
 *
 * 즉 "번들을 언제 만드느냐"의 책임이 앱 빌드에서 SDK 배포로 옮겨 갑니다.
 */
module.exports = mergeConfig(getDefaultConfig(__dirname), {});
