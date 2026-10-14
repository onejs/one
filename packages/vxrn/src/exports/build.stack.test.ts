import { expect, it } from 'vitest'

it('preserves the caller stack trace limit when importing build', async () => {
  const previousLimit = Error.stackTraceLimit
  Error.stackTraceLimit = 25
  try {
    await import('./build')
    expect(Error.stackTraceLimit).toBe(25)
  } finally {
    Error.stackTraceLimit = previousLimit
  }
})
