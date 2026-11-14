require 'digest'
require 'fileutils'
require 'tmpdir'

# the bun runtime and compiler come from an onejs/bun-engine release: the bun
# compiler (macOS) and ios/<platform>/{Bun,BunCompat}.framework. a compiled
# program only loads in the runtime it was compiled against, so the release is
# pinned. ONE_BUN_ENGINE_DIR points at a local engine build instead.
engine_version = '0.1.3'
engine_sha256 = 'e351e86b996a43cd865adc1a56a0b5389eeaa78c077fe0243034103a89f3a715'

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
  # with use_frameworks, react/runtime headers live in the JSITooling framework
  add_dependency(s, 'React-jsitooling', framework_name: 'JSITooling')
  s.dependency 'React-cxxreact'
end
