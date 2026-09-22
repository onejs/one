require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ReactNativeLite'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'MIT'
  s.author         = 'vxrn'
  s.homepage       = 'https://github.com/onejs/one'
  s.platforms      = {
    :ios => '15.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/onejs/one.git' }
  s.static_framework = true

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
  }

  s.frameworks     = 'UIKit', 'JavaScriptCore', 'QuartzCore'
  s.source_files   = 'ios/**/*.{h,m,swift}'
  s.exclude_files  = 'ios/Tests/**/*'
end
