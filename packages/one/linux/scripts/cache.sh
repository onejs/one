# sourced by the prepare scripts: the per react-native-version cache for Linux
# builds. Hermes, the third party sources and their builds live here and never
# ship in the npm package.
: "${RN_ROOT:?set RN_ROOT to node_modules/react-native}"
cache="${ONE_LINUX_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/ReactNative/linux}"
arch="$(uname -m)"
cores="$(nproc)"
mkdir -p "$cache"

rn_version() {
  sed -n 's/^  "version": "\(.*\)",$/\1/p' "$RN_ROOT/package.json"
}
