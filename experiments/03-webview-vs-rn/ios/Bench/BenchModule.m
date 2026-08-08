#import <React/RCTBridgeModule.h>

/**
 * Swift 로 쓴 네이티브 모듈을 RN 에 등록합니다.
 * 웹뷰 쪽에는 이 파일에 해당하는 것이 없습니다.
 * 대신 config.userContentController.add(self, name: "iosBridge") 한 줄로 등록하고,
 * 그 뒤에 JSON 파싱과 switch 분기가 붙습니다.
 */
@interface RCT_EXTERN_MODULE (Bench, NSObject)

RCT_EXTERN_METHOD(reportFirstPaint
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getHostInfo
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(finishWithResult : (NSDictionary *)result)

@end
