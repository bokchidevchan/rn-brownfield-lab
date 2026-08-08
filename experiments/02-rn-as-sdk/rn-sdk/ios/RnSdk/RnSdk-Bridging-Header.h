//
//  이 파일은 빌드에 포함되지 않습니다. 기록용으로 남겨 둡니다.
//
//  01 번에서는 앱 타깃이라 브리징 헤더로 RN 헤더를 노출했습니다.
//  SDK 는 프레임워크 타깃이라 그 방법을 쓸 수 없습니다.
//  Xcode 가 "Using bridging headers with framework targets is unsupported" 로 거부합니다.
//
//  그래서 SDK 쪽은 Swift 에서 `import React` 를 씁니다.
//  그러려면 React pod 이 모듈이어야 하고, Podfile 에서 이렇게 설정합니다.
//
//    ENV['USE_FRAMEWORKS'] = 'static'
//    use_frameworks! :linkage => :static
//
//  앱으로 붙일 때와 SDK 로 뺄 때 헤더 노출 방식이 달라지는 지점입니다.
//
