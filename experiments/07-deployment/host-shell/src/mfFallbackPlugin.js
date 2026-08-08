/**
 * 원격 로드 실패를 크래시 대신 값으로 바꾸는 런타임 플러그인. 05 와 같습니다.
 * 배포 실험에서는 "후보판 서버가 죽었을 때 앱이 살아남는가"가 더 중요해집니다.
 */
module.exports = function fallbackPlugin() {
  return {
    name: 'fallback-plugin',
    errorLoadRemote(args) {
      if (args && args.origin) {
        global.__mfFederationHost = args.origin;
      }
      const message = String(
        (args && args.error && args.error.message) || (args && args.error) || '원인 불명',
      );
      const marker = { __esModule: true, __mfLoadError: message };
      if (args && args.lifecycle === 'onLoad') {
        return () => marker;
      }
      return marker;
    },
  };
};
