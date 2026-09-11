require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'OneNative'
  s.version = package['version']
  s.summary = package['description']
  s.homepage = 'https://github.com/onejs/one'
  s.license = package['license']
  s.author = 'One'
  s.source = { :git => 'https://github.com/onejs/one.git' }
  s.platforms = { :ios => '18.0' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.source_files = 'ios/**/*.{h,m,mm,swift}', 'cpp/**/*.{h,cpp}'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/cpp"'
  }
  install_modules_dependencies(s)
end
