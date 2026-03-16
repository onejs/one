// shim that re-exports everything from react-native-web and stubs native-only APIs
// that don't exist in react-native-web but are imported by react-native packages
// during web dep pre-bundling (rolldown is strict about missing exports)
export * from 'react-native-web'

// native-only stubs
const noop = () => {}
const emptyObj = {}

export const TurboModuleRegistry = {
  get: () => null,
  getEnforcing: () => emptyObj,
}

export const DrawerLayoutAndroid = noop
export const PermissionsAndroid = { PERMISSIONS: {}, RESULTS: {}, check: noop, request: noop, requestMultiple: noop }
export const ToastAndroid = { show: noop, showWithGravity: noop, showWithGravityAndOffset: noop }
export const BackHandler = { addEventListener: () => ({ remove: noop }), exitApp: noop }
export const NativeEventEmitter = class { addListener() { return { remove: noop } } removeAllListeners() {} }
export const NativeModules = new Proxy({}, { get: () => emptyObj })
export const requireNativeComponent = () => noop
export const UIManager = { getViewManagerConfig: () => null, hasViewManagerConfig: () => false }
