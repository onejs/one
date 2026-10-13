import { assertKeepAwakeEnabled, assertKeepAwakeTag } from './validate'

function isEnabled(): Promise<boolean> {
  return Promise.resolve(false)
}

function setEnabled(enabled: boolean): Promise<void> {
  assertKeepAwakeEnabled(enabled)
  return Promise.resolve()
}

function activate(tag?: string): Promise<void> {
  assertKeepAwakeTag(tag, 'activate')
  return Promise.resolve()
}

function deactivate(tag?: string): Promise<void> {
  assertKeepAwakeTag(tag, 'deactivate')
  return Promise.resolve()
}

export const KeepAwake = Object.freeze({ isEnabled, setEnabled, activate, deactivate })
