import { describe, expect, it } from 'vitest'
import type { One } from '../vite/types'
import { getTypedRoutesDeclarationFile } from './getTypedRoutesDeclarationFile'

function createRouteContext(paths: string[]) {
  const context = (() => ({ default() {} })) as unknown as One.RouteContext
  Object.defineProperty(context, 'keys', {
    value: () => paths,
  })
  return context
}

describe(getTypedRoutesDeclarationFile, () => {
  it('does not emit trailing whitespace for multi-line route unions', () => {
    const declaration = getTypedRoutesDeclarationFile(
      createRouteContext(['./index+ssg.tsx', './about+ssg.tsx', './[slug]+ssg.tsx'])
    )

    expect(declaration).toContain('      StaticRoutes:\n        | `/`')
    expect(declaration).not.toMatch(/[ \t]+$/m)
  })
})
