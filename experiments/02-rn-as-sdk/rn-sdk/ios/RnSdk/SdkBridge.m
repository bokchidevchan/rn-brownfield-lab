#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

/**
 * Swift 로 쓴 네이티브 모듈을 RN 에 등록합니다.
 * RN 의 모듈 등록이 Objective-C 매크로라서 이 파일이 반드시 필요합니다.
 *
 * SDK 로 배포할 때 주의할 점이 하나 더 있습니다.
 * RCT_EXTERN_MODULE 이 만드는 등록 코드는 Objective-C 카테고리 형태라,
 * 정적 링크 과정에서 참조되지 않으면 링커가 떼어냅니다.
 * 소비 앱의 OTHER_LDFLAGS 에 -ObjC 가 필요한 이유입니다.
 * podspec 에서 그걸 강제합니다.
 */
@interface RCT_EXTERN_MODULE (RnSdkBridge, RCTEventEmitter)

RCT_EXTERN_METHOD(close)

RCT_EXTERN_METHOD(finishWithResult : (NSDictionary *)result)

RCT_EXTERN_METHOD(getHostInfo
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
