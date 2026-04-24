import { afterEach, describe, expect, it, vi } from 'vitest'
import { startUserInterface } from '../user-interface/index'
import { bindKeypressInput } from './bindKeypressInput'

type StartUserInterfaceContext = Parameters<typeof startUserInterface>[0]

const originalIsTTY = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY')
const originalSetRawMode = Object.getOwnPropertyDescriptor(process.stdin, 'setRawMode')

function restoreStdinProperty(
  property: 'isTTY' | 'setRawMode',
  descriptor?: PropertyDescriptor
) {
  if (descriptor) {
    Object.defineProperty(process.stdin, property, descriptor)
    return
  }

  Reflect.deleteProperty(process.stdin, property)
}

function stubNonInteractiveStdin() {
  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: false,
  })
  Object.defineProperty(process.stdin, 'setRawMode', {
    configurable: true,
    value: undefined,
  })
}

afterEach(() => {
  restoreStdinProperty('isTTY', originalIsTTY)
  restoreStdinProperty('setRawMode', originalSetRawMode)
  vi.restoreAllMocks()
})

describe('bindKeypressInput', () => {
  it('does not warn when stdin is not interactive', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubNonInteractiveStdin()

    bindKeypressInput()

    expect(warn).not.toHaveBeenCalled()
  })
})

describe('startUserInterface', () => {
  it('does not print keyboard commands when stdin is not interactive', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    stubNonInteractiveStdin()

    await startUserInterface({ server: {} } as StartUserInterfaceContext)

    expect(info).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
  })
})
