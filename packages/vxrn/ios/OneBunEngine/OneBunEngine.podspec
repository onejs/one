# the bun runtime and compiler are not in this package: ONE_BUN_ENGINE_DIR names
# a directory with bun (the macOS compiler) and ios/<platform>/{Bun,BunCompat}.framework
engine_dir = ENV['ONE_BUN_ENGINE_DIR']
if engine_dir.nil? || !File.directory?(File.join(engine_dir, 'ios'))
  raise "[one] the bun engine needs ONE_BUN_ENGINE_DIR set to its runtime directory during pod install"
end
engine_dir = File.expand_path(engine_dir)

Pod::Spec.new do |s|
  s.name = 'OneBunEngine'
  s.version = '0.0.1'
  s.summary = 'Runs a React Native release build on Bun ahead-of-time compiled JavaScript'
  s.license = 'MIT'
  s.authors = 'One'
  s.homepage = 'https://onestack.dev'
  s.source = { :path => '.' }
  s.platforms = { :ios => '17.0' }
  s.source_files = '*.{h,mm,cpp}'
  s.public_header_files = 'OneBunEngine.h'
  # weak: debug builds run hermes and ship no bun; release builds embed it in the bundle phase
  link = {
    'FRAMEWORK_SEARCH_PATHS' => "\"#{engine_dir}/ios/$(PLATFORM_NAME)\"",
    'OTHER_LDFLAGS' => '$(inherited) -weak_framework Bun',
    'ONE_BUN_ENGINE_DIR' => engine_dir,
    'ONE_BUN_ENGINE_SCRIPT' => File.join(__dir__, 'embed.sh'),
  }
  s.pod_target_xcconfig = link.merge('CLANG_CXX_LANGUAGE_STANDARD' => 'c++20')
  s.user_target_xcconfig = link
  install_modules_dependencies(s)
  s.dependency 'React-jsitooling'
  s.dependency 'React-cxxreact'
end
