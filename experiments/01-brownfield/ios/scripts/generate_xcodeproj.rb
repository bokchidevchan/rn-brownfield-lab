#!/usr/bin/env ruby
# frozen_string_literal: true

#
# BrownfieldHost.xcodeproj 를 만들어 내는 스크립트.
#
# pbxproj 는 손으로 고치면 diff 를 읽을 수 없고, 충돌이 나면 복구가 어렵습니다.
# 이 예제에서 "무엇을 설정했는지"가 읽히는 게 중요해서 생성 스크립트를 남깁니다.
# 생성된 .xcodeproj 도 같이 커밋합니다. 저장소를 받자마자 pod install 로 넘어갈 수 있게요.
#
# 실행:
#   ruby ios/scripts/generate_xcodeproj.rb
#
# xcodeproj gem 은 CocoaPods 를 깔면 같이 들어옵니다.
#

require 'fileutils'
require 'xcodeproj'

IOS_DIR = File.expand_path('..', __dir__)
PROJECT_NAME = 'BrownfieldHost'
BUNDLE_ID = 'com.example.brownfield'
DEPLOYMENT_TARGET = '15.1' # RN 0.76 의 min_ios_version_supported

project_path = File.join(IOS_DIR, "#{PROJECT_NAME}.xcodeproj")
FileUtils.rm_rf(project_path)

project = Xcodeproj::Project.new(project_path)
target = project.new_target(:application, PROJECT_NAME, :ios, DEPLOYMENT_TARGET)

group = project.new_group(PROJECT_NAME, PROJECT_NAME)

# 컴파일 대상. HostBridge.m 이 빠지면 JS 에서 NativeModules.HostBridge 가 undefined 가 됩니다.
Dir[File.join(IOS_DIR, PROJECT_NAME, '*.{swift,m}')].sort.each do |path|
  target.add_file_references([group.new_reference(path)])
end

# 컴파일 대상은 아니지만 Xcode 에서 보여야 하는 파일들
['Info.plist', "#{PROJECT_NAME}-Bridging-Header.h"].each do |name|
  group.new_reference(File.join(IOS_DIR, PROJECT_NAME, name))
end

COMMON_SETTINGS = {
  'PRODUCT_NAME' => '$(TARGET_NAME)',
  'PRODUCT_BUNDLE_IDENTIFIER' => BUNDLE_ID,
  'INFOPLIST_FILE' => "#{PROJECT_NAME}/Info.plist",
  'IPHONEOS_DEPLOYMENT_TARGET' => DEPLOYMENT_TARGET,
  'TARGETED_DEVICE_FAMILY' => '1',
  'SWIFT_VERSION' => '5.0',

  # Swift 에서 RN 의 Objective-C 헤더를 보게 해 주는 설정.
  # 브라운필드에서 Swift 로 붙일 때 이 한 줄이 빠져서 막히는 경우가 많습니다.
  'SWIFT_OBJC_BRIDGING_HEADER' => "#{PROJECT_NAME}/#{PROJECT_NAME}-Bridging-Header.h",

  'CLANG_ENABLE_MODULES' => 'YES',
  'ALWAYS_SEARCH_USER_PATHS' => 'NO',

  # RN 의 빌드 스크립트가 프로젝트 밖(node_modules)을 읽고 씁니다.
  # 샌드박스가 켜져 있으면 Xcode 15 부터 스크립트 페이즈가 권한 오류로 실패합니다.
  'ENABLE_USER_SCRIPT_SANDBOXING' => 'NO',

  # RN 은 Objective-C 카테고리로 모듈을 등록해서 -ObjC 가 필요합니다.
  'OTHER_LDFLAGS' => ['$(inherited)', '-ObjC', '-lc++'],
  'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks'],

  # 서명 정보는 저장소에 넣지 않습니다.
  # 시뮬레이터 빌드는 서명 없이 되고, 실기기에 올릴 때만 각자 Xcode 에서 팀을 고릅니다.
  'CODE_SIGN_STYLE' => 'Automatic',
  'CODE_SIGN_IDENTITY[sdk=iphonesimulator*]' => '',
  'CODE_SIGNING_REQUIRED[sdk=iphonesimulator*]' => 'NO',
  'CODE_SIGNING_ALLOWED[sdk=iphonesimulator*]' => 'NO',
}.freeze

DEBUG_SETTINGS = {
  'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => 'DEBUG',
  'GCC_PREPROCESSOR_DEFINITIONS' => ['DEBUG=1', '$(inherited)'],
  'SWIFT_OPTIMIZATION_LEVEL' => '-Onone',
  'ONLY_ACTIVE_ARCH' => 'YES',
  'ENABLE_TESTABILITY' => 'YES',
}.freeze

RELEASE_SETTINGS = {
  'SWIFT_OPTIMIZATION_LEVEL' => '-O',
  'SWIFT_COMPILATION_MODE' => 'wholemodule',
  'VALIDATE_PRODUCT' => 'YES',
}.freeze

project.build_configurations.each do |config|
  config.build_settings['SDKROOT'] = 'iphoneos'
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT_TARGET
end

target.build_configurations.each do |config|
  config.build_settings.merge!(COMMON_SETTINGS)
  config.build_settings.merge!(
    config.name == 'Debug' ? DEBUG_SETTINGS : RELEASE_SETTINGS
  )
end

# 릴리스 빌드에서 JS 번들을 뽑아 앱에 넣는 빌드 페이즈.
# 디버그 빌드에서는 react-native-xcode.sh 가 스스로 건너뜁니다(Metro 에 붙으므로).
# REACT_NATIVE_PATH 는 pod install 이 만든 xcconfig 가 넣어 줍니다.
bundle_phase = target.new_shell_script_build_phase('Bundle React Native code and images')
bundle_phase.shell_script = <<~SHELL
  set -e

  WITH_ENVIRONMENT="$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh"
  REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"

  /bin/sh -c "$WITH_ENVIRONMENT \\"$REACT_NATIVE_XCODE\\""
SHELL

project.save

# 공유 스킴. 이게 없으면 xcodebuild 가 스킴을 못 찾고, Xcode 로 한 번 연 사람만
# 로컬에 자동 생성된 스킴을 갖게 됩니다. CI 에서 바로 걸리는 부분입니다.
scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.save_as(project_path, PROJECT_NAME, true)

puts "생성 완료: #{project_path}"
puts '다음: cd ios && pod install'
