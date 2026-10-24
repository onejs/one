# Builds the Windows React Native C++ core and the headless smoke binary for the
# installed react-native with clang-cl and the MSVC STL: third party sources,
# their build, Hermes and the core, each cached per react-native version in the
# user cache. Run it from an x64 Visual Studio developer shell with CC and CXX
# naming clang-cl. Each phase can run alone, in this order; the core compiles
# against the Hermes headers, so the Hermes build is only needed to link.
#   RN_ROOT      node_modules/react-native
#   NATIVE_CORE  packages/one/native-core, by default the sibling of windows/
#   -Logs        directory for each phase's full output
# Prints the core build directory; run one-windows-smoke.exe smoke.hbc there.
param(
  [ValidateSet('all', 'deps', 'core', 'hermes', 'smoke')] [string] $Phase = 'all',
  [ValidateSet('debug', 'release')] [string] $Config = 'release',
  [string] $Logs = "$PSScriptRoot/../build-logs"
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/cache.ps1"

$buildType = if ($Config -eq 'debug') { 'Debug' } else { 'Release' }
$nativeCore = if ($env:NATIVE_CORE) { $env:NATIVE_CORE } else { "$PSScriptRoot/../../native-core" }
$rn = RnVersion
$sources = "$Cache/third-party/$rn"
$deps = "$Cache/deps-$rn-$Config"
$hermes = "$Cache/hermes-$(HermesVersion)-$Config"
$core = "$Cache/core-$rn-$Config"
New-Item -ItemType Directory -Force $Logs | Out-Null

# runs a native command with its output in the console and in $Logs/$name.log
function Logged($name) {
  $command = $args[0]
  & $command @($args | Select-Object -Skip 1) 2>&1 | Tee-Object -FilePath "$Logs/$name.log" -Append | Out-Host
  if ($LASTEXITCODE) { throw "$name failed: $command exited with $LASTEXITCODE" }
}

if ($Phase -in 'all', 'deps') {
  & "$PSScriptRoot/prepare-deps.ps1" $sources
  Logged deps cmake -G Ninja -S "$PSScriptRoot/../cpp/deps" -B $deps `
    "-DCMAKE_BUILD_TYPE=$buildType" `
    "-DCMAKE_POLICY_VERSION_MINIMUM=3.5" `
    "-DTP_ROOT=$sources"
  Logged deps cmake --build $deps
}

if ($Phase -in 'all', 'core') {
  & "$PSScriptRoot/prepare-hermes.ps1" $hermes $Config -HeadersOnly
  Logged core cmake -G Ninja -S "$PSScriptRoot/../cpp" -B $core `
    "-DCMAKE_BUILD_TYPE=$buildType" `
    "-DRN_ROOT=$env:RN_ROOT" `
    "-DNATIVE_CORE=$nativeCore" `
    "-DHERMES_ROOT=$hermes/destroot" `
    "-DDEPS_CMAKE=$deps/OneWindowsDeps.cmake"
  # -k 0 reports every unit that fails, not only the first
  Logged core ninja -C $core -k 0 OneWindowsCore
}

if ($Phase -in 'all', 'hermes') {
  & "$PSScriptRoot/prepare-hermes.ps1" $hermes $Config 2>&1 | Tee-Object -FilePath "$Logs/hermes.log" -Append | Out-Host
}

if ($Phase -in 'all', 'smoke') {
  Logged smoke ninja -C $core one-windows-smoke
  Logged smoke "$hermes/destroot/bin/hermesc.exe" -emit-binary -O -out "$core/smoke.hbc" "$PSScriptRoot/../smoke/smoke.js"
}

$core
