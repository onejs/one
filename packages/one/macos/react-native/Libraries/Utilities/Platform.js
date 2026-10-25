import PlatformIOS from 'react-native/Libraries/Utilities/Platform.ios.js'

// react-native's own Platform.ios.js reports OS 'ios'. On macOS the file
// resolution still uses that implementation, and this object is the owned
// override so Platform.OS is 'macos'. Getters stay on the ios object so
// constants are read when the native module is ready, not at import.
const Platform = Object.create(PlatformIOS, {
  OS: { value: 'macos', enumerable: true },
  select: {
    value(spec) {
      if (spec != null && Object.prototype.hasOwnProperty.call(spec, 'macos')) {
        return spec.macos
      }
      if (spec != null && Object.prototype.hasOwnProperty.call(spec, 'native')) {
        return spec.native
      }
      return spec == null ? undefined : spec.default
    },
  },
})

export default Platform
