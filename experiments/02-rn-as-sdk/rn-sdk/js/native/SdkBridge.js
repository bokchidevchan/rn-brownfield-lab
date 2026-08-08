import {NativeEventEmitter, NativeModules} from 'react-native';

/**
 * 01 번의 HostBridge 와 역할은 같지만 방향이 반대입니다.
 *
 * 01 번: RN 화면이 "호스트 앱"에 요청했습니다. 호스트가 무엇인지 RN 이 알고 있었습니다.
 * 02 번: RN 화면은 "SDK 껍데기"에만 요청합니다. 그 뒤에 어떤 앱이 있는지 모릅니다.
 *        소비 앱이 무엇을 하는지는 SDK 가 노출한 리스너로 전달됩니다.
 *
 * 이 방향이 중요한 이유는 SDK 를 여러 앱에 배포할 수 있어야 하기 때문입니다.
 * 특정 앱을 전제한 메서드가 여기 들어오는 순간 그 SDK 는 그 앱 전용이 됩니다.
 */
const {RnSdkBridge} = NativeModules;

if (!RnSdkBridge) {
  throw new Error(
    'RnSdkBridge 네이티브 모듈을 찾지 못했습니다. ' +
      'AAR 이 제대로 링크됐는지, SdkBridgePackage 가 등록됐는지 확인하세요.',
  );
}

const emitter = new NativeEventEmitter(RnSdkBridge);

/** 화면을 닫습니다. 어떻게 닫히는지는 SDK 가 정합니다. */
export function close() {
  RnSdkBridge.close();
}

/** 결과를 SDK 로 넘기고 닫습니다. SDK 가 소비 앱의 리스너로 전달합니다. */
export function finishWithResult(result) {
  RnSdkBridge.finishWithResult(result);
}

/** SDK 를 품고 있는 앱의 정보. 소비 앱이 initialize 할 때 넘긴 값입니다. */
export function getHostInfo() {
  return RnSdkBridge.getHostInfo();
}

export function addThemeChangeListener(listener) {
  return emitter.addListener('themeChanged', listener);
}
