/**
 * Re.Pack 은 Metro 를 대체하므로 CLI 명령을 직접 등록해야 합니다.
 * 이 파일이 없으면 `react-native bundle` 이 Metro 로 돌아서
 * Module Federation 설정이 통째로 무시됩니다. 에러도 안 납니다.
 */
const commands = require('@callstack/repack/commands/rspack');

module.exports = {
  commands,
};

// 네이티브 앱이 이 디렉토리 밖(../android)에 있어서 위치를 알려 줍니다.
// 03 번, 04 번과 같은 이유입니다.
module.exports.project = {
  android: { sourceDir: '../android' },
};
