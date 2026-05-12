import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { withOne } from './withOne'

const projectRoot = path.resolve(__dirname, '../../')

describe('withOne', () => {
  it('attaches a resolveRequest that empties .server.* modules', () => {
    const defaultResolve = vi.fn(() => ({ type: 'sourceFile', filePath: '/orig.js' }))

    const config = withOne(
      {
        resolver: {
          resolveRequest: defaultResolve as any,
        },
      },
      { projectRoot }
    )

    const resolveRequest = config.resolver?.resolveRequest as Function
    expect(typeof resolveRequest).toBe('function')

    const ctx = { resolveRequest: defaultResolve }
    const result = resolveRequest(ctx, './some-file.server.ts', 'ios')

    expect(result.type).toBe('sourceFile')
    expect(result.filePath).toMatch(/empty\.js$/)
    expect(defaultResolve).not.toHaveBeenCalled()
  })

  it('empties .css imports', () => {
    const config = withOne<{ resolver: Record<string, any> }>(
      { resolver: {} },
      { projectRoot }
    )
    const resolveRequest = config.resolver?.resolveRequest as Function

    const result = resolveRequest({} as any, './styles.css', 'ios')
    expect(result.filePath).toMatch(/empty\.js$/)
  })

  it('empties _middleware files', () => {
    const config = withOne<{ resolver: Record<string, any> }>(
      { resolver: {} },
      { projectRoot }
    )
    const resolveRequest = config.resolver?.resolveRequest as Function

    expect(resolveRequest({} as any, './_middleware.tsx', 'ios').filePath).toMatch(
      /empty\.js$/
    )
    expect(resolveRequest({} as any, './_middleware.ts', 'ios').filePath).toMatch(
      /empty\.js$/
    )
  })

  it('delegates non-special modules to the underlying resolver', () => {
    const defaultResolve = vi.fn(() => ({ type: 'sourceFile', filePath: '/real.js' }))
    const config = withOne(
      { resolver: { resolveRequest: defaultResolve as any } },
      { projectRoot }
    )
    const resolveRequest = config.resolver?.resolveRequest as Function

    const result = resolveRequest({ resolveRequest: defaultResolve } as any, 'react', 'ios')
    expect(result.filePath).toBe('/real.js')
    expect(defaultResolve).toHaveBeenCalledOnce()
  })
})
