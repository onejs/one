// Mock for expo-modules-core used in vitest tests

export const EventEmitter = class EventEmitter {
  addListener() {}
  removeListener() {}
  emit() {}
}

export const NativeModulesProxy = {}
export const requireNativeModule = () => ({})
export const requireOptionalNativeModule = () => null
