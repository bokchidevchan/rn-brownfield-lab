#!/usr/bin/env ruby
# frozen_string_literal: true

#
# SDK 를 빌드하기 위한 프레임워크 타깃 프로젝트를 만듭니다.
# 이 프로젝트는 배포물이 아니라 XCFramework 를 뽑기 위한 도구입니다.
#
# 실행: ruby ios/scripts/generate_project.rb
#

require 'fileutils'
require 'xcodeproj'

IOS_DIR = File.expand_path('..', __dir__)
SOURCE_DIR = 'RnSdk'
# 모듈 이름을 클래스 이름과 다르게 둡니다. 같으면 .swiftinterface 에서
# RnSdk.RnSdk.Config 로 풀리며 "is not a member type of class" 로 깨집니다.
NAME = 'RnSdkKit'
DEPLOYMENT_TARGET = '15.1'

project_path = File.join(IOS_DIR, "#{NAME}.xcodeproj")
FileUtils.rm_rf(project_path)

project = Xcodeproj::Project.new(project_path)

# 정적이 아니라 동적 프레임워크입니다.
# React pod 들을 정적으로 흡수해서 하나의 바이너리로 만들기 위해서입니다.
target = project.new_target(:framework, NAME, :ios, DEPLOYMENT_TARGET)

group = project.new_group(NAME, SOURCE_DIR)

Dir[File.join(IOS_DIR, SOURCE_DIR, '*.{swift,m}')].sort.each do |path|
  target.add_file_references([group.new_reference(path)])
end

# JS 번들을 프레임워크 리소스로 넣습니다.
#
# Android 는 src/main/assets 에 파일만 두면 AAR 이 알아서 담고 소비 앱 APK 로 병합됩니다.
# iOS 는 Resources 빌드 페이즈에 명시적으로 넣어야 합니다. 빠뜨리면 빌드도 되고
# xcframework 도 만들어지고 앱 설치까지 되는데, 런타임에 이렇게 죽습니다.
#   Fatal error: SDK 리소스에서 main.jsbundle 을 찾지 못했습니다
resources_dir = File.join(IOS_DIR, SOURCE_DIR, 'Resources')
if Dir.exist?(resources_dir)
  resource_group = group.new_group('Resources', 'Resources')
  Dir[File.join(resources_dir, '*')].sort.each do |path|
    target.add_resources([resource_group.new_reference(path)])
  end
end

# umbrella 헤더는 public 으로 넣어야 모듈이 성립합니다.
umbrella = group.new_reference(File.join(IOS_DIR, SOURCE_DIR, "#{NAME}.h"))
target.headers_build_phase.add_file_reference(umbrella).tap do |bf|
  bf.settings = { 'ATTRIBUTES' => ['Public'] }
end

SETTINGS = {
  'PRODUCT_NAME' => NAME,
  'PRODUCT_BUNDLE_IDENTIFIER' => 'com.example.rnsdk',
  'IPHONEOS_DEPLOYMENT_TARGET' => DEPLOYMENT_TARGET,
  'SWIFT_VERSION' => '5.0',
  'DEFINES_MODULE' => 'YES',

  # 프레임워크에도 Info.plist 가 필요합니다. 없으면 xcframework 는 만들어지는데
  # 소비 앱에 embed 된 뒤 설치 단계에서 이렇게 거부됩니다.
  #   Failed to load Info.plist from bundle at path .../RnSdkKit.framework
  # 빌드가 아니라 설치에서 터져서 원인을 찾기 어렵습니다.
  'GENERATE_INFOPLIST_FILE' => 'YES',
  'MARKETING_VERSION' => '0.1.0',
  'CURRENT_PROJECT_VERSION' => '1',

  # XCFramework 로 배포하려면 필요합니다.
  # Swift 모듈 인터페이스(.swiftinterface)를 만들어서, 다른 Swift 버전으로
  # 컴파일된 소비 앱도 이 프레임워크를 쓸 수 있게 합니다.
  'BUILD_LIBRARY_FOR_DISTRIBUTION' => 'YES',

  # 시뮬레이터와 기기 슬라이스를 각각 뽑아 합칠 것이므로 아카이브에서 전부 빌드합니다.
  'SKIP_INSTALL' => 'NO',

  # RN 은 Objective-C 카테고리로 모듈을 등록합니다.
  # -ObjC 가 없으면 링커가 떼어내고, 런타임에 NativeModules 가 비어 보입니다.
  'OTHER_LDFLAGS' => ['$(inherited)', '-ObjC'],

  'ENABLE_USER_SCRIPT_SANDBOXING' => 'NO',
  'CODE_SIGN_IDENTITY' => '',
  'CODE_SIGNING_REQUIRED' => 'NO',
  'CODE_SIGNING_ALLOWED' => 'NO',
}.freeze

project.build_configurations.each do |config|
  config.build_settings['SDKROOT'] = 'iphoneos'
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT_TARGET
end

target.build_configurations.each do |config|
  config.build_settings.merge!(SETTINGS)
  config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] =
    config.name == 'Debug' ? '-Onone' : '-O'
end

project.save

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.save_as(project_path, NAME, true)

puts "생성 완료: #{project_path}"
puts '다음: cd ios && pod install && ./scripts/build_xcframework.sh'
