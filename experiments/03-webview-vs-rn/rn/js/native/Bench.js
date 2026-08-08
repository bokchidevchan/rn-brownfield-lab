import {NativeModules} from 'react-native';

/**
 * 웹뷰 쪽 index.html 의 통신 계층과 나란히 놓고 비교하려고 만든 파일입니다.
 *
 * 웹뷰에서는 이 파일에 해당하는 코드가 40줄쯤 됩니다.
 * 요청 ID 발급, 콜백 테이블, 타임아웃, Android/iOS 전송 경로 분기가 전부 앱 코드입니다.
 * RN 은 그게 프레임워크 안에 있어서 여기 남는 건 호출뿐입니다.
 */
const {Bench} = NativeModules;

if (!Bench) {
  throw new Error('Bench 네이티브 모듈을 찾지 못했습니다.');
}

/**
 * 첫 렌더가 화면에 나간 직후 네이티브에 알리고, 측정값을 돌려받습니다.
 * 웹뷰의 FIRST_PAINT 와 같은 신호인데, 저쪽은 값을 받으려고
 * 네이티브가 evaluateJavascript 로 문자열을 주입해야 합니다.
 */
export function reportFirstPaint() {
  return Bench.reportFirstPaint();
}

/** 웹뷰의 request('HOST_INFO') 와 같은 일. 이쪽은 한 줄입니다. */
export function getHostInfo() {
  return Bench.getHostInfo();
}

export function finishWithResult(result) {
  Bench.finishWithResult(result);
}
