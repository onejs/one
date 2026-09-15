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
    'OTHER_SWIFT_FLAGS' => '$(inherited) -Xcc -Wno-non-modular-include-in-framework-module',
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/cpp"',
  }

  s.exclude_files = 'ios/Tests/**/*'
  s.source_files = 'ios/**/*.{h,m,swift,mm,cpp}', 'cpp/**/*.{h,cpp}'

  install_modules_dependencies(s)
end
