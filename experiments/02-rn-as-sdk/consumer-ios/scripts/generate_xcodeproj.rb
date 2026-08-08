#!/usr/bin/env ruby
# frozen_string_literal: true

#
# 소비 앱 프로젝트를 만듭니다.
#
# 01 번의 생성 스크립트와 비교하면 사라진 설정들이 있습니다.
#   SWIFT_OBJC_BRIDGING_HEADER   RN 헤더를 볼 일이 없습니다
#   "Bundle React Native code and images" 빌드 페이즈
#                                번들은 SDK 안에 이미 들어 있습니다
#
# 실행: ruby scripts/generate_xcodeproj.rb
#

require 'fileutils'
require 'xcodeproj'

ROOT = File.expand_path('..', __dir__)
NAME = 'ShopApp'
BUNDLE_ID = 'com.example.shopapp'
DEPLOYMENT_TARGET = '15.1'

project_path = File.join(ROOT, "#{NAME}.xcodeproj")
FileUtils.rm_rf(project_path)

project = Xcodeproj::Project.new(project_path)
target = project.new_target(:application, NAME, :ios, DEPLOYMENT_TARGET)
group = project.new_group(NAME, NAME)

Dir[File.join(ROOT, NAME, '*.swift')].sort.each do |path|
  target.add_file_references([group.new_reference(path)])
end
group.new_reference(File.join(ROOT, NAME, 'Info.plist'))

SETTINGS = {
  'PRODUCT_NAME' => '$(TARGET_NAME)',
  'PRODUCT_BUNDLE_IDENTIFIER' => BUNDLE_ID,
  'INFOPLIST_FILE' => "#{NAME}/Info.plist",
  'IPHONEOS_DEPLOYMENT_TARGET' => DEPLOYMENT_TARGET,
  'TARGETED_DEVICE_FAMILY' => '1',
  'SWIFT_VERSION' => '5.0',
  'ALWAYS_SEARCH_USER_PATHS' => 'NO',
  'ENABLE_USER_SCRIPT_SANDBOXING' => 'NO',

  # RnSdk.podspec 의 user_target_xcconfig 가 -ObjC 를 넣어 주지만,
  # 왜 필요한지 잊지 않도록 여기서도 남겨 둡니다.
  # RN 은 Objective-C 카테고리로 네이티브 모듈을 등록하고,
  # 이 플래그가 없으면 링커가 떼어냅니다.
  'OTHER_LDFLAGS' => ['$(inherited)', '-ObjC'],

  'LD_RUNPATH_SEARCH_PATHS' => ['$(inherited)', '@executable_path/Frameworks'],
  'CODE_SIGN_STYLE' => 'Automatic',
  'CODE_SIGN_IDENTITY[sdk=iphonesimulator*]' => '',
  'CODE_SIGNING_REQUIRED[sdk=iphonesimulator*]' => 'NO',
  'CODE_SIGNING_ALLOWED[sdk=iphonesimulator*]' => 'NO',
}.freeze

project.build_configurations.each do |config|
  config.build_settings['SDKROOT'] = 'iphoneos'
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT_TARGET
end

target.build_configurations.each do |config|
  config.build_settings.merge!(SETTINGS)
  if config.name == 'Debug'
    config.build_settings['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = 'DEBUG'
    config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
    config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'
  else
    config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-O'
  end
end

project.save

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.save_as(project_path, NAME, true)

puts "생성 완료: #{project_path}"
puts '다음: pod install && open ShopApp.xcworkspace'
