//
//  Swift 코드가 RN 의 Objective-C 타입을 보게 해 주는 파일.
//
//  `import React` 로도 되는 경우가 있지만, RN 의 Pod 는 설정에 따라 modular header 가
//  꺼져 있기도 합니다(use_frameworks! 없이 static library 로 붙는 기본 구성이 그렇습니다).
//  그러면 Swift 모듈로 import 가 안 되고, 에러 메시지도 원인과 멀어서 헤매기 쉽습니다.
//  기존 앱에 붙일 때는 브리징 헤더로 명시하는 쪽이 예측 가능합니다.
//

#import <React/RCTBridge.h>
#import <React/RCTBridgeDelegate.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTRootView.h>
