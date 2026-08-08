import {NativeModules} from 'react-native';

/**
 * 03 번과 같은 계측 모듈입니다.
 *
 * 여기서 확인할 것이 하나 더 있습니다. 이 파일은 구아키텍처와 신아키텍처에서
 * 코드가 똑같습니다. NativeModules 로 접근하는 방식이 그대로 동작합니다.
 * 신아키텍처가 TurboModule 로 바뀌어도 JS 쪽 호출 코드는 안 바뀝니다.
 * 달라지는 건 네이티브 등록 방식과 로딩 시점입니다.
 */
const {Bench} = NativeModules;

if (!Bench) {
  throw new Error('Bench 네이티브 모듈을 찾지 못했습니다.');
}

export function reportFirstPaint(tag) {
  return Bench.reportFirstPaint(tag);
}

export function getArchInfo() {
  return Bench.getArchInfo();
}
