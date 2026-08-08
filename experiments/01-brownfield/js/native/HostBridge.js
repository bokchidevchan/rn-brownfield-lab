import {NativeEventEmitter, NativeModules} from 'react-native';

/**
 * 네이티브 호스트와 통신하는 창구를 한 파일로 모아 둡니다.
 *
 * 브라운필드에서 이 레이어를 따로 두는 이유:
 * RN 화면은 네이티브 앱의 일부라서 "닫기", "결과 돌려주기", "로그인 상태 물어보기" 같은
 * 호스트 의존 동작이 화면마다 생깁니다. NativeModules.HostBridge 를 컴포넌트에서 직접 부르면
 * 안드로이드/iOS 구현 차이가 화면 코드에 그대로 새어 나옵니다.
 */
const {HostBridge} = NativeModules;

if (!HostBridge) {
  throw new Error(
    'HostBridge 네이티브 모듈을 찾지 못했습니다. ' +
      'android 는 HostBridgePackage 가 ReactNativeHost.getPackages() 에 들어갔는지, ' +
      'ios 는 HostBridge.m 이 타깃에 포함됐는지 확인하세요.',
  );
}

const emitter = new NativeEventEmitter(HostBridge);

/** RN 화면을 닫고 네이티브 화면으로 돌아갑니다. */
export function closeScreen() {
  HostBridge.closeScreen();
}

/**
 * 결과를 네이티브로 넘기고 화면을 닫습니다.
 * 안드로이드는 setResult + finish, iOS 는 delegate 콜백으로 처리합니다.
 */
export function finishWithResult(result) {
  HostBridge.finishWithResult(result);
}

/**
 * 호스트 앱 정보를 물어봅니다. Promise 를 돌려주는 메서드는
 * 네이티브에서 Promise(android) / RCTPromiseResolveBlock(ios) 로 구현돼 있습니다.
 */
export function getHostInfo() {
  return HostBridge.getHostInfo();
}

/**
 * 네이티브 → RN 단방향 이벤트.
 * 반환값(subscription)은 화면이 unmount 될 때 반드시 remove 해야 합니다.
 * RN 인스턴스를 화면 간에 공유하는 구조에서는 리스너가 살아남아 누수가 됩니다.
 */
export function addThemeChangeListener(listener) {
  return emitter.addListener('hostThemeChanged', listener);
}

export const EVENT_NAME = 'hostThemeChanged';
