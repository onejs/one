import { assertKeepAwakeEnabled } from './validate'

const unsupported = (): never => {
  throw new Error('KeepAwake requires an iOS native build')
}

function isEnabled(): Promise<boolean> {
  return unsupported()
}

function setEnabled(enabled: boolean): Promise<void> {
  assertKeepAwakeEnabled(enabled)
  return unsupported()
}

export const KeepAwake = Object.freeze({ isEnabled, setEnabled })
