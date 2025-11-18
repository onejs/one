// Stub for react-native-mmkv on web
export function createMMKV() {
  // Return a mock MMKV instance
  return {
    set: () => {},
    getString: () => undefined,
    getNumber: () => undefined,
    getBoolean: () => undefined,
    contains: () => false,
    delete: () => {},
    clearAll: () => {},
    getAllKeys: () => [],
  }
}

export default {}
