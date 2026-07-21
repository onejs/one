require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'VxrnNative'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'vxrn'
  s.homepage       = 'https://github.com/onejs/one'
  s.platforms      = {
    :ios => '15.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/onejs/one.git' }
  s.static_framework = true

  s.dependency 'React-Core'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES' => 'YES',
    'OTHER_SWIFT_FLAGS' => '$(inherited) -Xcc -Wno-non-modular-include-in-framework-module',
  }

  s.source_files = 'ios/**/*.{h,m,swift,mm,cpp}'
  s.exclude_files = 'ios/Tests/**/*'
end
