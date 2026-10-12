import { describe, expect, it } from 'vitest'
import { rethrowNativeError } from '../src/platform/nativeError'

function codeOf(message: string): { code: unknown; message: string } {
  try {
    rethrowNativeError(new Error(message))
  } catch (error) {
    const shaped = error as Error & { code?: unknown }
    return { code: shaped.code, message: shaped.message }
  }
  throw new Error('rethrowNativeError did not throw')
}

describe('rethrowNativeError', () => {
  it('restores the code from an async rejection', () => {
    expect(codeOf('E_FILE_URI: FileSystem.play: expected an absolute file URI')).toEqual({
      code: 'E_FILE_URI',
      message: 'FileSystem.play: expected an absolute file URI',
    })
  })

  it('restores the code past the sync throw prefix', () => {
    expect(
      codeOf(
        'OneFileSystem.writeText(...): E_FILE_ENCODING: FileSystem.writeText: invalid base64 contents'
      )
    ).toEqual({
      code: 'E_FILE_ENCODING',
      message: 'FileSystem.writeText: invalid base64 contents',
    })
  })

  it('trims the android trailing newline before parsing', () => {
    expect(codeOf('E_FILE_STATE: FileSystem.seek: not ready\n')).toEqual({
      code: 'E_FILE_STATE',
      message: 'FileSystem.seek: not ready',
    })
  })

  it('leaves uncoded errors untouched', () => {
    expect(codeOf('something broke')).toEqual({ code: undefined, message: 'something broke' })
  })

  it('passes non-errors through', () => {
    expect(() => rethrowNativeError('nope')).toThrow('nope')
  })
})
