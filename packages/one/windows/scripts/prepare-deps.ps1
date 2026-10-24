# Downloads and lays out the third party sources react-native's core needs
# (folly, glog, fmt, double-conversion, fast_float and the boost headers) into
# $Out, at the versions pinned in react-native's gradle/libs.versions.toml.
# double-conversion, fmt and fast_float get the CMake files react-native's
# Android build uses; glog keeps its own CMake build, which has the Windows port,
# and folly is compiled by cpp/deps/CMakeLists.txt. Tarballs are cached and
# reused per react-native version. The sources are laid out beside $Out and
# moved into place whole, so a stamped $Out is complete and reused; anything
# else already at $Out is left untouched and the script refuses to continue.
#   RN_ROOT  node_modules/react-native
param([Parameter(Mandatory)] [string] $Out)
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/cache.ps1"

$rnVersion = RnVersion
$toml = Get-Content "$env:RN_ROOT/gradle/libs.versions.toml"
$jni = "$env:RN_ROOT/ReactAndroid/src/main/jni/third-party"
function Pinned($name) {
  foreach ($line in $toml) {
    if ($line -match "^$name *= *`"(.*)`"") { return $Matches[1] }
  }
  throw "no $name pin in libs.versions.toml"
}
$boost = Pinned boost
$doubleConversion = Pinned doubleconversion
$fastFloat = Pinned fastFloat
$fmt = Pinned fmt
$folly = Pinned folly
$glog = Pinned glog

$stamp = "$Out/.react-native-version"
if (Test-Path $stamp) {
  $stamped = Get-Content $stamp
  if ($stamped -eq $rnVersion) { exit 0 }
  throw "$Out is laid out for react-native $stamped, not $rnVersion; move it aside to lay out the sources again"
}
if (Test-Path $Out) {
  if (Get-ChildItem -Force $Out | Select-Object -First 1) {
    throw "$Out has content but no $rnVersion stamp, so it may be incomplete or not this script's; move it aside to lay out the sources again"
  }
  # only an empty directory, which the move below would otherwise land inside
  [IO.Directory]::Delete($Out)
}

function Fetch($file, $url) {
  $path = "$Cache/downloads/$file"
  if (-not (Test-Path $path)) {
    & curl.exe -fsSL $url -o "$path.part"
    if ($LASTEXITCODE) { throw "download failed: $url" }
    Move-Item "$path.part" $path
  }
  $path
}

# strips the archive's top directory, extracting only the given members; the
# system tar is bsdtar, which matches members by path prefix
function Unpack($tarball, $dest) {
  New-Item -ItemType Directory -Force $dest | Out-Null
  & "$env:SystemRoot/System32/tar.exe" -xzf $tarball -C $dest --strip-components=1 @args
  if ($LASTEXITCODE) { throw "unpack failed: $tarball" }
}

$part = "$Out.part-$PID"
$work = Join-Path ([IO.Path]::GetTempPath()) "one-windows-deps-$PID"
New-Item -ItemType Directory -Force $part, "$Cache/downloads" | Out-Null
try {
  $tarball = Fetch "boost_$boost.tar.gz" "https://archives.boost.io/release/$($boost -replace '_', '.')/source/boost_$boost.tar.gz"
  Unpack $tarball "$part/boost/boost_$boost" "boost_$boost/boost"

  $tarball = Fetch "double-conversion-$doubleConversion.tar.gz" "https://github.com/google/double-conversion/archive/v$doubleConversion.tar.gz"
  Unpack $tarball "$work/double-conversion"
  New-Item -ItemType Directory -Force "$part/double-conversion/double-conversion" | Out-Null
  Copy-Item "$work/double-conversion/src/*.cc", "$work/double-conversion/src/*.h" "$part/double-conversion/double-conversion/"
  Copy-Item "$jni/double-conversion/CMakeLists.txt" "$part/double-conversion/"

  $tarball = Fetch "folly-$folly.tar.gz" "https://github.com/facebook/folly/archive/v$folly.tar.gz"
  Unpack $tarball "$part/folly" "folly-$folly/folly"

  $tarball = Fetch "fast_float-$fastFloat.tar.gz" "https://github.com/fastfloat/fast_float/archive/v$fastFloat.tar.gz"
  Unpack $tarball "$part/fast_float" "fast_float-$fastFloat/include"
  Copy-Item "$jni/fast_float/CMakeLists.txt" "$part/fast_float/"

  $tarball = Fetch "fmt-$fmt.tar.gz" "https://github.com/fmtlib/fmt/archive/$fmt.tar.gz"
  Unpack $tarball "$part/fmt" "fmt-$fmt/src" "fmt-$fmt/include"
  Copy-Item "$jni/fmt/CMakeLists.txt" "$part/fmt/"

  $tarball = Fetch "glog-$glog.tar.gz" "https://github.com/google/glog/archive/v$glog.tar.gz"
  Unpack $tarball "$part/glog"

  "boost $boost`ndouble-conversion $doubleConversion`nfast_float $fastFloat`nfmt $fmt`nfolly $folly`nglog $glog" | Set-Content "$part/versions.txt"
  Set-Content "$part/.react-native-version" $rnVersion
  Move-Item $part $Out
} finally {
  foreach ($dir in $work, $part) {
    if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
  }
}
