import type { DeviceInfo } from '../specs/OneDevice.nitro'

export type { DeviceInfo }

export const Device = Object.freeze({
  getInfo: (): Promise<DeviceInfo> => {
    throw new Error('Device requires an iOS native build')
  },
})
