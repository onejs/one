# Builds Hermes for Windows from source at the revision the installed
# react-native pins (the HERMES_VERSION_NAME the macOS build downloads as a
# prebuilt and the Linux build compiles) into $Out/destroot:
# include/hermes, lib/hermesvm.lib, bin/hermesvm.dll and bin/hermesc.exe, with
# the compiler in CC and CXX. -HeadersOnly clones the source and lays out only
# include/, which is all the core needs to compile. Reuses the destroot while
# the version and config match.
#   RN_ROOT  node_modules/react-native
param(
  [Parameter(Mandatory)] [string] $Out,
  [ValidateSet('debug', 'release')] [string] $Config = 'release',
  [switch] $HeadersOnly
)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/cache.ps1"

$version = HermesVersion
$src = "$Cache/src/hermes-$version"
$stamp = "$Out/.hermes-version"
$key = "$version-$Config-$env:CXX"
if ((Test-Path "$Out/destroot/bin/hermesvm.dll") -and ((Get-Content $stamp -ErrorAction SilentlyContinue) -eq $key)) { exit 0 }

if (-not (Test-Path $src)) {
  New-Item -ItemType Directory -Force "$Cache/src" | Out-Null
  Run git clone -q --depth 1 --branch "hermes-v$version" https://github.com/facebook/hermes.git "$src.part"
  Move-Item "$src.part" $src
}

$include = "$Out/destroot/include/hermes"
New-Item -ItemType Directory -Force "$include/Public", "$include/cdp" | Out-Null
Copy-Item "$src/API/hermes/*.h" "$include/"
Copy-Item "$src/API/hermes/cdp/*.h" "$include/cdp/"
Copy-Item "$src/public/hermes/Public/*.h" "$include/Public/"
if ($HeadersOnly) { exit 0 }

if ($Config -eq 'debug') { $buildType = 'Debug'; $debugger = 'ON' } else { $buildType = 'Release'; $debugger = 'OFF' }

# the options of react-native's build-apple-framework.sh that apply here; jsi
# comes from react-native, as it does for every other platform. Ninja drives
# the build, so the Visual Studio /MP switch stays off.
Run cmake -G Ninja -S $src -B "$Out/build" `
  "-DCMAKE_BUILD_TYPE=$buildType" `
  "-DHERMES_ENABLE_DEBUGGER=$debugger" `
  -DHERMES_ENABLE_INTL=OFF `
  -DHERMES_ENABLE_TEST_SUITE=OFF `
  -DHERMES_ENABLE_LIBFUZZER=OFF `
  -DHERMES_ENABLE_FUZZILLI=OFF `
  -DHERMES_BUILD_SHARED_JSI=OFF `
  -DHERMES_MSVC_MP=OFF `
  "-DHERMES_RELEASE_VERSION=for RN $(RnVersion)" `
  "-DJSI_DIR=$env:RN_ROOT/ReactCommon/jsi"
Run ninja -C "$Out/build" hermesvm hermesc

$built = "$Out/build"
New-Item -ItemType Directory -Force "$Out/destroot/lib", "$Out/destroot/bin" | Out-Null
foreach ($file in 'hermesvm.dll', 'hermesvm.lib', 'hermesc.exe') {
  $found = Get-ChildItem -Recurse -File -Filter $file $built | Select-Object -First 1
  if (-not $found) { throw "hermes build produced no $file" }
  $dest = if ($file -like '*.lib') { "$Out/destroot/lib" } else { "$Out/destroot/bin" }
  Copy-Item $found.FullName $dest
}
Set-Content $stamp $key
