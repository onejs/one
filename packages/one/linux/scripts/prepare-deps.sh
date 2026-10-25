#!/bin/bash
# Downloads and lays out the third party sources react-native's Android build
# compiles (folly, glog, fmt, double-conversion, fast_float and the boost
# headers) into $1, at the versions pinned in react-native's
# gradle/libs.versions.toml. The layout is the one ReactAndroid's
# third-party-ndk directory has, so react-native's own CMake files build it.
# Tarballs are cached next to the output and reused per react-native version.
#   RN_ROOT  node_modules/react-native
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
source "$here/cache.sh"

out="$1"
rn_version="$(rn_version)"
toml="$RN_ROOT/gradle/libs.versions.toml"
jni="$RN_ROOT/ReactAndroid/src/main/jni/third-party"

pinned() { sed -n "s/^$1 *= *\"\(.*\)\"/\1/p" "$toml"; }
boost="$(pinned boost)"
double_conversion="$(pinned doubleconversion)"
fast_float="$(pinned fastFloat)"
fmt="$(pinned fmt)"
folly="$(pinned folly)"
glog="$(pinned glog)"

stamp="$out/.react-native-version"
if [ "$(cat "$stamp" 2>/dev/null)" = "$rn_version" ]; then
  exit 0
fi
rm -rf "$out"
mkdir -p "$out" "$cache/downloads"

fetch() {
  local file="$cache/downloads/$1"
  if [ ! -f "$file" ]; then
    curl -fsSL "$2" -o "$file.part"
    mv "$file.part" "$file"
  fi
  echo "$file"
}

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# strips the archive's top directory, extracting only the matching members
unpack() {
  local tarball="$1" dest="$2"
  shift 2
  mkdir -p "$dest"
  tar -xzf "$tarball" -C "$dest" --strip-components=1 "$@"
}

tarball="$(fetch "boost_$boost.tar.gz" "https://archives.boost.io/release/${boost//_/.}/source/boost_$boost.tar.gz")"
unpack "$tarball" "$out/boost/boost_$boost" --wildcards "boost_$boost/boost"

tarball="$(fetch "double-conversion-$double_conversion.tar.gz" "https://github.com/google/double-conversion/archive/v$double_conversion.tar.gz")"
unpack "$tarball" "$work/double-conversion"
mkdir -p "$out/double-conversion/double-conversion"
cp "$work"/double-conversion/src/*.{cc,h} "$out/double-conversion/double-conversion/"
cp "$jni/double-conversion/CMakeLists.txt" "$out/double-conversion/"

tarball="$(fetch "folly-$folly.tar.gz" "https://github.com/facebook/folly/archive/v$folly.tar.gz")"
unpack "$tarball" "$out/folly" --wildcards "folly-$folly/folly"
cp "$jni/folly/CMakeLists.txt" "$out/folly/"

tarball="$(fetch "fast_float-$fast_float.tar.gz" "https://github.com/fastfloat/fast_float/archive/v$fast_float.tar.gz")"
unpack "$tarball" "$out/fast_float" --wildcards "fast_float-$fast_float/include"
cp "$jni/fast_float/CMakeLists.txt" "$out/fast_float/"

tarball="$(fetch "fmt-$fmt.tar.gz" "https://github.com/fmtlib/fmt/archive/$fmt.tar.gz")"
unpack "$tarball" "$out/fmt" --wildcards "fmt-$fmt/src" "fmt-$fmt/include"
cp "$jni/fmt/CMakeLists.txt" "$out/fmt/"

# glog: the .h.in headers are configured with the tokens ReactAndroid's
# PrepareGlogTask substitutes, and the public headers go to exported/glog
tarball="$(fetch "glog-$glog.tar.gz" "https://github.com/google/glog/archive/v$glog.tar.gz")"
unpack "$tarball" "$out/glog/glog-$glog" --wildcards "glog-$glog/src"
cp "$jni/glog/CMakeLists.txt" "$jni/glog/config.h" "$out/glog/"
for template in "$out"/glog/glog-"$glog"/src/glog/*.h.in; do
  sed \
    -e 's/@ac_cv_have_unistd_h@/1/g' \
    -e 's/@ac_cv_have_stdint_h@/1/g' \
    -e 's/@ac_cv_have_systypes_h@/1/g' \
    -e 's/@ac_cv_have_inttypes_h@/1/g' \
    -e 's/@ac_cv_have_libgflags@/0/g' \
    -e 's/@ac_google_start_namespace@/namespace google {/g' \
    -e 's/@ac_cv_have_uint16_t@/1/g' \
    -e 's/@ac_cv_have_u_int16_t@/1/g' \
    -e 's/@ac_cv_have___uint16@/0/g' \
    -e 's/@ac_google_end_namespace@/}/g' \
    -e 's/@ac_cv_have___builtin_expect@/1/g' \
    -e 's/@ac_google_namespace@/google/g' \
    -e 's/@ac_cv___attribute___noinline@/__attribute__ ((noinline))/g' \
    -e 's/@ac_cv___attribute___noreturn@/__attribute__ ((noreturn))/g' \
    -e 's/@ac_cv___attribute___printf_4_5@/__attribute__((__format__ (__printf__, 4, 5)))/g' \
    "$template" > "${template%.in}"
done
mkdir -p "$out/glog/exported/glog"
cp "$out"/glog/glog-"$glog"/src/glog/{stl_logging,logging,raw_logging,vlog_is_on,log_severity}.h "$out/glog/exported/glog/"
# RN's CMakeLists compiles glog-$glog/src from the glog directory
echo "$rn_version" > "$stamp"
