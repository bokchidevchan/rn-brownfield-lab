#!/usr/bin/env ruby
# frozen_string_literal: true

require 'fileutils'
require 'xcodeproj'

IOS_DIR = File.expand_path('..', __dir__)
NAME = 'Bench'
BUNDLE_ID = 'com.example.bench'
DEPLOYMENT_TARGET = '15.1'

project_path = File.join(IOS_DIR, "#{NAME}.xcodeproj")
FileUtils.rm_rf(project_path)

project = Xcodeproj::Project.new(project_path)
target = project.new_target(:application, NAME, :ios, DEPLOYMENT_TARGET)
group = project.new_group(NAME, NAME)

Dir[File.join(IOS_DIR, NAME, '*.{swift,m}')].sort.each do |path|
  target.add_file_references([group.new_reference(path)])
end
['Info.plist', "#{NAME}-Bridging-Header.h"].each do |name|
  group.new_reference(File.join(IOS_DIR, NAME, name))
end

# JS 번들을 앱 리소스로 넣습니다.
# 02 번에서 이걸 빼먹고 런타임에 죽었습니다. Android 는 assets 에 두면 자동인데
# iOS 는 Resources 빌드 페이즈에 명시해야 합니다.
bundle_path = File.join(IOS_DIR, 'main.jsbundle')
if File.exist?(bundle_path)
  target.add_resources([group.new_reference(bundle_path)])
else
  warn "경고: #{bundle_path} 가 없습니다. rn 에서 npm run bundle:ios 를 먼저 돌리세요."
end

SETTINGS = {
  'PRODUCT_NAME' => '$(TARGET_NAME)',
  'PRODUCT_BUNDLE_IDENTIFIER' => BUNDLE_ID,
  'INFOPLIST_FILE' => "#{NAME}/Info.plist",
  'IPHONEOS_DEPLOYMENT_TARGET' => DEPLOYMENT_TARGET,
  'TARGETED_DEVICE_FAMILY' => '1',
  'SWIFT_VERSION' => '5.0',
  'SWIFT_OBJC_BRIDGING_HEADER' => "#{NAME}/#{NAME}-Bridging-Header.h",
  'CLANG_ENABLE_MODULES' => 'YES',
  'ALWAYS_SEARCH_USER_PATHS' => 'NO',
  'ENABLE_USER_SCRIPT_SANDBOXING' => 'NO',
  'OTHER_LDFLAGS' => ['$(inherited)', '-ObjC', '-lc++'],
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
    config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = ['DEBUG=1', '$(inherited)']
    config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
    config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'
  else
    config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-O'
    config.build_settings['SWIFT_COMPILATION_MODE'] = 'wholemodule'
  end
end

project.save

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(target)
scheme.set_launch_target(target)
scheme.save_as(project_path, NAME, true)

puts "생성 완료: #{project_path}"
puts '다음: pod install'
