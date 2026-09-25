require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
schema = JSON.parse(File.read(File.join(__dir__, 'schema.json')))

Pod::Spec.new do |s|
  s.name           = 'One'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'one'
  s.homepage       = 'https://github.com/onejs/one'
  s.platforms      = { :ios => "#{schema['minimumVersion']}.0" }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/onejs/one.git' }
  s.static_framework = true

  sdk_version = Gem::Version.new(`xcrun --sdk iphoneos --show-sdk-version`.strip)
  swift_flags = '$(inherited) -Xcc -Wno-non-modular-include-in-framework-module'
  # one flag per SDK that declares newer api: generated swift guards that api with it, so
  # an older Xcode still compiles. codegen/sdkGuard.ts lists the same versions.
  { '27' => 'ONE_IOS_27_SDK', '27.1' => 'ONE_IOS_27_1_SDK' }.each do |version, flag|
    swift_flags += " -D #{flag}" if sdk_version >= Gem::Version.new(version)
  end
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'incremental',
    'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES' => 'YES',
    'OTHER_SWIFT_FLAGS' => swift_flags,
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/cpp" "$(OBJECT_FILE_DIR_normal)/$(CURRENT_ARCH)"',
  }

  s.exclude_files = 'ios/Tests/**/*'
  s.source_files = 'ios/**/*.{h,m,swift,mm,cpp}', 'cpp/**/*.{h,cpp}'

  # nitro hybrid objects: nitrogen generates the specs and bridges from
  # src/specs/*.nitro.ts into nitrogen/generated (see README).
  load 'nitrogen/generated/ios/One+autolinking.rb'
  add_nitrogen_files(s)
  # objc++ units build without clang modules, so One-Swift.h skips its
  # own @import lines (React, UserNotifications) and never sees the nitro
  # bridge types its c++ section names; every unit gets them first.
  s.prefix_header_contents = "#ifdef __OBJC__\n#import <React/RCTView.h>\n#import <UserNotifications/UserNotifications.h>\n#endif\n#ifdef __cplusplus\n#include \"One-Swift-Cxx-Bridge.hpp\"\n#endif"

  s.dependency 'RNWorklets'

  install_modules_dependencies(s)
end
