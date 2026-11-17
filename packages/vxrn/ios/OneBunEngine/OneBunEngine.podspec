require 'digest'
require 'fileutils'
require 'tmpdir'

# the bun runtime and compiler come from an onejs/bun-engine release: the bun
# compiler (macOS), ios/<platform>/BunEngine.o, the runtime as one prelinked
# object the app links statically, and ios/BunEngine.tbd, its exports. a
# compiled program only loads in the runtime it was compiled against, so the
# release is pinned. ONE_BUN_ENGINE_DIR points at a local engine build instead.
engine_version = '0.2.2'
engine_sha256 = '56b41350e1c3f5cc2e11f4f21b1bb4925226df683a853177b70686385ca9f6ef'

# a lambda, since cocoapods evaluates podspecs where top-level methods are not reachable
one_bun_engine_dir = lambda do
  dir = ENV['ONE_BUN_ENGINE_DIR']
  unless dir.nil? || dir.empty?
    raise "[one] ONE_BUN_ENGINE_DIR has no ios folder: #{dir}" unless File.directory?(File.join(dir, 'ios'))
    return File.expand_path(dir)
  end
  cache = File.join(Dir.home, 'Library/Caches/one/bun-engine', engine_version)
  dir = File.join(cache, 'bun-engine')
  return dir if File.directory?(File.join(dir, 'ios'))
  FileUtils.mkdir_p(cache)
  url = "https://github.com/onejs/bun-engine/releases/download/v#{engine_version}/bun-engine-#{engine_version}-ios.tar.gz"
  Dir.mktmpdir('download', cache) do |tmp|
    tarball = File.join(tmp, 'engine.tar.gz')
    Pod::UI.puts "[one] downloading the bun engine #{engine_version}"
    system('curl', '-fsSL', '--retry', '3', '-o', tarball, url) or raise "[one] could not download the bun engine from #{url}"
    raise "[one] the bun engine download from #{url} does not match its checksum" unless Digest::SHA256.file(tarball).hexdigest == engine_sha256
    system('tar', '-xzf', tarball, '-C', tmp) or raise "[one] could not unpack the bun engine"
    File.rename(File.join(tmp, 'bun-engine'), dir)
  end
  dir
end

engine_dir = one_bun_engine_dir.call

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
  # the pod is static, so the app executable links the runtime and the program
  # the bundle phase compiles. debug builds run hermes and link the runtime's
  # exports weakly without it
  s.static_framework = true
  s.pod_target_xcconfig = { 'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20' }
  s.user_target_xcconfig = {
    'ONE_BUN_ENGINE_DIR' => engine_dir,
    # the runtime is arm64 only
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'x86_64',
    'ONE_BUN_ENGINE_SCRIPT' => File.join(__dir__, 'embed.sh'),
    'ONE_BUN_ENGINE_LDFLAGS' => '"$(ONE_BUN_ENGINE_DIR)/ios/$(PLATFORM_NAME)/BunEngine.o" -Wl,-sectcreate,__TEXT,__bun,"$(DERIVED_FILE_DIR)/one-bun-program" -Wl,-sectalign,__TEXT,__bun,0x4000',
    'ONE_BUN_ENGINE_LDFLAGS[config=*Debug*]' => '-Wl,-weak_library,"$(ONE_BUN_ENGINE_DIR)/ios/BunEngine.tbd"',
    'OTHER_LDFLAGS' => '$(inherited) $(ONE_BUN_ENGINE_LDFLAGS)',
  }
  install_modules_dependencies(s)
  # with use_frameworks, react/runtime headers live in the JSITooling framework
  add_dependency(s, 'React-jsitooling', framework_name: 'JSITooling')
  add_dependency(s, 'React-jsinspector', framework_name: 'jsinspector_modern')
  add_dependency(s, 'React-jsinspectortracing', framework_name: 'jsinspector_moderntracing')
  s.dependency 'React-cxxreact'
end
