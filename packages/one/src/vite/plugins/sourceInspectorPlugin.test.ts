import { describe, expect, it } from 'vitest'
import { parseSync } from 'oxc-parser'

import {
  getSourceInspectorPath,
  injectSourceToJsx,
  resolveEditorFilePath,
} from './sourceInspectorPlugin'

describe('sourceInspectorPlugin helpers', () => {
  describe('getSourceInspectorPath', () => {
    it('keeps project files relative to the current cwd', () => {
      expect(getSourceInspectorPath('/repo/packages/one/src/App.tsx', '/repo')).toBe(
        '/packages/one/src/App.tsx'
      )
    })

    it('does not strip matching path prefixes from files outside cwd', () => {
      expect(
        getSourceInspectorPath('/repo-other/packages/one/src/App.tsx', '/repo')
      ).toBe('/repo-other/packages/one/src/App.tsx')
    })
  })

  describe('resolveEditorFilePath', () => {
    it('resolves project-relative source paths against cwd', () => {
      const fileExists = (filePath: string) =>
        filePath === '/repo/packages/one/src/App.tsx'

      expect(
        resolveEditorFilePath('/packages/one/src/App.tsx', '/repo', fileExists)
      ).toBe('/repo/packages/one/src/App.tsx')
    })

    it('preserves absolute source paths for files outside cwd', () => {
      expect(
        resolveEditorFilePath(
          '/Users/n8/shared/ui/Button.tsx',
          '/repo/apps/site',
          () => false
        )
      ).toBe('/Users/n8/shared/ui/Button.tsx')
    })
  })

  describe('injectSourceToJsx', () => {
    it('keeps JSX type arguments before injected attributes', async () => {
      for (const tag of ['WebView<unknown>', 'Preview.WebView<Array<unknown>>']) {
        const id = `${process.cwd()}/src/Preview.tsx`
        const input = `const preview = <${tag} ref={webRef} />`
        const out = await injectSourceToJsx(input, id)
        expect(out).toBeDefined()

        const parsed = parseSync(id, out!.code)
        expect(parsed.errors).toEqual([])
        const declaration = parsed.program.body[0] as any
        const element = declaration.declarations[0].init.openingElement
        const args = element.typeArguments
        expect(out!.code.slice(args.start, args.end)).toBe(tag.slice(tag.indexOf('<')))
        expect(element.attributes.map((attr: any) => attr.name.name)).toEqual([
          'data-one-source',
          'ref',
        ])
        expect(element.attributes[1].value.expression.name).toBe('webRef')
        expect(await injectSourceToJsx(out!.code, id)).toBeUndefined()
      }
    })

    it('tags dom elements and components but leaves custom reconciler tags alone', async () => {
      const out = await injectSourceToJsx(
        [
          'export const Scene = () => (',
          '  <div>',
          '    <Canvas>',
          '      <mesh position={[0, 1, 0]}>',
          '        <boxGeometry />',
          '        <meshStandardMaterial color="red" />',
          '      </mesh>',
          '      <instancedMesh args={[geometry, material, 4]} />',
          '    </Canvas>',
          '    <svg><linearGradient id="g" /></svg>',
          '  </div>',
          ')',
        ].join('\n'),
        `${process.cwd()}/src/Scene.tsx`
      )
      const code = out?.code ?? ''
      expect(code).toContain('<div data-one-source=')
      expect(code).toContain('<Canvas data-one-source=')
      expect(code).toContain('<svg data-one-source=')
      expect(code).toContain('<linearGradient data-one-source=')
      expect(code).toContain('<mesh position=')
      expect(code).toContain('<boxGeometry />')
      expect(code).toContain('<meshStandardMaterial color=')
      expect(code).toContain('<instancedMesh args=')
      expect(code).not.toMatch(
        /<(mesh|boxGeometry|meshStandardMaterial|instancedMesh) data-one-source/
      )
    })
  })
})
