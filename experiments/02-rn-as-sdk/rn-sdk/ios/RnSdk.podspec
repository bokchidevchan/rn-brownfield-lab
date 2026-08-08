Pod::Spec.new do |s|
  s.name         = 'RnSdk'
  s.version      = '0.1.0'
  s.summary      = 'RN 화면을 네이티브 앱에 붙이는 SDK'
  s.homepage     = 'https://github.com/bokchidevchan/rn-brownfield-lab'
  s.license      = { :type => 'MIT' }
  s.author       = { 'rn-brownfield-lab' => 'noreply@example.com' }
  s.platforms    = { :ios => '15.1' }
  s.source       = { :path => '.' }

  # Android 는 AAR 하나였습니다. 여기는 둘입니다.
  #
  #   RnSdkKit.xcframework 우리 Swift 코드 + React pod 들을 정적으로 흡수한 동적 프레임워크
  #   hermes.xcframework   RN 이 미리 빌드해 배포하는 동적 프레임워크
  #
  # hermes 를 RnSdk 안으로 흡수할 수 없습니다. 이미 동적 프레임워크로 배포되기 때문입니다.
  # 정적 병합(libtool)은 .a 만 다룹니다. 그래서 소비 앱이 둘 다 embed 해야 합니다.
  s.vendored_frameworks = 'dist/RnSdkKit.xcframework', 'dist/hermes.xcframework'

  # RN 은 Objective-C 카테고리로 네이티브 모듈을 등록합니다.
  # -ObjC 가 없으면 링커가 떼어내고 런타임에 NativeModules 가 비어 보입니다.
  # 소비 앱 타깃에도 걸어야 해서 user_target_xcconfig 에 넣습니다.
  s.user_target_xcconfig = { 'OTHER_LDFLAGS' => '-ObjC' }
end
