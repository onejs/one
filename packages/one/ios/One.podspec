require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'One'
  s.version        = package['version']
  s.summary        = 'One Router Native Module'
  s.description    = 'Native iOS module for One Router - provides Link preview and context menu functionality'
  s.license        = package['license']
  s.author         = 'Tamagui'
  s.homepage       = 'https://github.com/tamagui/one'
  s.platforms      = {
    :ios => '15.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/tamagui/one.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'RNScreens'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
  }

  s.source_files = "**/*.{h,m,swift}"
end
