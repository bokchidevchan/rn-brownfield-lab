/**
 * Module Federation 런타임 플러그인. 원격 로드 실패를 처리합니다.
 *
 * 왜 필요한가.
 *
 * 서버가 죽은 상태에서 import('featureCart/CartScreen') 을 부르면
 * 실패가 항상 이 promise 의 reject 로 오지 않습니다. federation 런타임이
 * 내부에서 던진 에러가 처리되지 않은 채로 남고, 릴리스 번들에서는
 * 그게 JavascriptException 이 되어 앱 프로세스가 통째로 죽습니다.
 * try/catch 나 .catch() 로는 못 잡는 위치입니다.
 *
 * errorLoadRemote 훅이 그 에러를 가로채는 공식 통로입니다.
 * 여기서 값을 돌려주면 크래시 대신 그 값이 모듈 자리에 들어갑니다.
 *
 * default 를 일부러 뺀 마커 객체를 돌려줍니다. HostScreen 이
 * mod.default 유무로 성공과 실패를 구분해 에러 UI 로 보냅니다.
 * "실패했는데 성공한 척"이 아니라 "실패를 값으로 바꿔서 전달"입니다.
 */
module.exports = function fallbackPlugin() {
  return {
    name: 'fallback-plugin',
    errorLoadRemote(args) {
      // 폴백을 돌려주면 런타임이 그걸 정상 모듈로 캐시합니다.
      // 그대로 두면 서버가 살아나도 재시도가 캐시만 돌려받습니다.
      // 재시도 쪽에서 캐시를 지울 수 있게 런타임 인스턴스를 밖에 내놓습니다.
      if (args && args.origin) {
        global.__mfFederationHost = args.origin;
      }
      const message = String(
        (args && args.error && args.error.message) || (args && args.error) || '원인 불명',
      );
      // __esModule 이 없으면 ESM interop 이 이 객체를 { default: marker } 로
      // 한 겹 감싸서, 받는 쪽의 default 검사가 뚫립니다. 겪고 나서 달았습니다.
      const marker = { __esModule: true, __mfLoadError: message };
      // onLoad 단계는 모듈 팩토리를 기대하므로 함수로, 그 외에는 값으로.
      if (args && args.lifecycle === 'onLoad') {
        return () => marker;
      }
      return marker;
    },
  };
};
