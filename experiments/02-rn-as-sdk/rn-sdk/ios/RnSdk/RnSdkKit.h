//
//  프레임워크의 umbrella 헤더.
//
//  파일 이름이 모듈 이름(RnSdkKit)이고, 공개 클래스 이름은 RnSdk 입니다.
//  둘을 같게 두면 .swiftinterface 에서 `RnSdk.RnSdk.Config` 로 풀리면서
//  "'RnSdk' is not a member type of class 'RnSdk.RnSdk'" 로 소비 앱 빌드가 깨집니다.
//  모듈과 타입 이름을 분리하는 게 Swift 프레임워크의 관행입니다.
//

#import <Foundation/Foundation.h>

FOUNDATION_EXPORT double RnSdkKitVersionNumber;
FOUNDATION_EXPORT const unsigned char RnSdkKitVersionString[];
