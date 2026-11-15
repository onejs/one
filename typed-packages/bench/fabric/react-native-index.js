// stands in for react-native's main entry: the parts @tamagui/core reads on native, over Fabric host views
const React = require('react')
const host = (name) => React.forwardRef((props, ref) => React.createElement(name, { ...props, ref }))
const listener = { remove() {} }
module.exports = {
  View: host('RCTView'),
  Text: host('RCTText'),
  TextInput: host('RCTView'),
  Pressable: host('RCTView'),
  unstable_NativeText: 'RCTText',
  unstable_TextAncestorContext: React.createContext(false),
  StyleSheet: { create: (s) => s, flatten: (s) => (Array.isArray(s) ? Object.assign({}, ...s.flat(Infinity).filter(Boolean)) : s), hairlineWidth: 0.5, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'ios', Version: '17.0', isPad: false, isTV: false, select: (o) => ('ios' in o ? o.ios : o.native ?? o.default) },
  PixelRatio: { get: () => 3, getFontScale: () => 1, roundToNearestPixel: (n) => Math.round(n * 3) / 3, getPixelSizeForLayoutSize: (n) => Math.round(n * 3) },
  Dimensions: { get: () => ({ width: 393, height: 852, scale: 3, fontScale: 1 }), addEventListener: () => listener },
  Appearance: { getColorScheme: () => 'light', addChangeListener: () => listener, setColorScheme() {} },
  AccessibilityInfo: { addEventListener: () => listener, isReduceMotionEnabled: () => Promise.resolve(false) },
  useColorScheme: () => 'light',
  useWindowDimensions: () => ({ width: 393, height: 852, scale: 3, fontScale: 1 }),
  usePressability: () => ({}),
}
