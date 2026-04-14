import { describe, expect, it } from 'vitest'

import { getSourceInspectorPath, resolveEditorFilePath } from './sourceInspectorPlugin'

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
})
