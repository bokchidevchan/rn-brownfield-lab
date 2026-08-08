#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

/**
 * Swift 로 쓴 네이티브 모듈을 RN 에 등록하는 파일.
 *
 * RN 의 모듈 등록은 Objective-C 매크로로 돌아갑니다. Swift 에서는 그 매크로를 쓸 수 없어서
 * 이 .m 파일이 반드시 한 장 필요합니다. 브라운필드에서 "Swift 로 모듈 만들었는데
 * NativeModules 에 안 잡힌다"의 원인은 대부분 이 파일이 없거나 타깃에서 빠진 경우입니다.
 *
 * 메서드 시그니처는 Swift 쪽 @objc 선언과 정확히 맞아야 합니다.
 * 어긋나면 컴파일은 통과하고 런타임에 "unrecognized selector" 로 터집니다.
 */
@interface RCT_EXTERN_MODULE (HostBridge, RCTEventEmitter)

RCT_EXTERN_METHOD(closeScreen)

RCT_EXTERN_METHOD(finishWithResult : (NSDictionary *)result)

RCT_EXTERN_METHOD(getHostInfo
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
