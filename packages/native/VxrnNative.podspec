require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
schema = JSON.parse(File.read(File.join(__dir__, 'schema.json')))

Pod::Spec.new do |s|
  s.name           = 'VxrnNative'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'vxrn'
  s.homepage       = 'https://github.com/onejs/one'
  s.platforms      = { :ios => "#{schema['minimumVersion']}.0" }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/onejs/one.git' }
  s.static_framework = true

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'incremental',
    'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES' => 'YES',
    # the iPhone Duo APIs (SwiftUI ArrangementView, UIHingeInteraction, reserved
    # regions) first ship in the iOS 27.1 SDK, and Swift has no compile-time SDK
    # check, so the 27.0 SDK builds without ONE_IOS_27_1_SDK.
    'OTHER_SWIFT_FLAGS' => '$(inherited) -Xcc -Wno-non-modular-include-in-framework-module -D ONE_IOS_27_1_SDK',
    'OTHER_SWIFT_FLAGS[sdk=iphoneos27.0*]' => '$(inherited) -Xcc -Wno-non-modular-include-in-framework-module',
    'OTHER_SWIFT_FLAGS[sdk=iphonesimulator27.0*]' => '$(inherited) -Xcc -Wno-non-modular-include-in-framework-module',
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/cpp" "$(OBJECT_FILE_DIR_normal)/$(CURRENT_ARCH)"',
  }

  s.exclude_files = 'ios/Tests/**/*'
  s.source_files = 'ios/**/*.{h,m,swift,mm,cpp}', 'cpp/**/*.{h,cpp}'

  s.dependency 'RNWorklets'

  install_modules_dependencies(s)
end
