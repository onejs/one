// hardware-back handler: the android analog of escape-to-dismiss. web has no
// hardware back key, and Escape covers dismissal there, so this is a no-op;
// hardwareBack.native.ts registers with the platform.

export function useHardwareBackHandler(_handler: () => void, _enabled = true) {}
