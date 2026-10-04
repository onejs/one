import { assertKeepAwakeEnabled } from './validate'

function isEnabled(): Promise<boolean> {
  return Promise.resolve(false)
}

function setEnabled(enabled: boolean): Promise<void> {
  assertKeepAwakeEnabled(enabled)
  return Promise.resolve()
}

export const KeepAwake = Object.freeze({ isEnabled, setEnabled })
