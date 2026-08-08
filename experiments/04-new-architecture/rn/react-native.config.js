/**
 * JS 루트와 네이티브 프로젝트가 떨어져 있을 때 RN CLI 에 위치를 알려 줍니다.
 *
 * CLI 는 기본적으로 package.json 옆에 android/ 와 ios/ 가 있다고 가정합니다.
 * 이 저장소는 rn/ 아래에 JS 만 있고 네이티브는 형제 디렉토리라 그 가정이 깨집니다.
 * 그대로 두면 autolinking 이 이렇게 실패합니다.
 *
 *   RNGP - Autolinking: Could not find project.android.packageName
 *   in react-native config output!
 *
 * 02 번에서 SDK 를 만들 때 use_native_modules! 가 실패했던 것과 같은 원인입니다.
 * 그때는 서드파티가 없어서 autolinking 을 건너뛰었지만, 여기서는 이 파일로 고쳤습니다.
 * 기존 앱에 RN 을 붙일 때 디렉토리 구조가 표준과 다르면 거의 항상 필요합니다.
 */
module.exports = {
  project: {
    android: {
      sourceDir: '../android',
    },
    ios: {
      sourceDir: '../ios',
    },
  },
};
