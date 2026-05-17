import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  isPathInsideDirectory,
  isRouteFilePath,
  isRouteFileWatchEvent,
} from './routeFileWatch'

describe(isRouteFilePath, () => {
  it('matches route source files', () => {
    expect(isRouteFilePath('/project/app/index.ts')).toBe(true)
    expect(isRouteFilePath('/project/app/index.tsx')).toBe(true)
    expect(isRouteFilePath('/project/app/index.js')).toBe(true)
    expect(isRouteFilePath('/project/app/index.jsx')).toBe(true)
  })

  it('ignores non-route files', () => {
    expect(isRouteFilePath('/project/app/tamagui.generated.css')).toBe(false)
    expect(isRouteFilePath('/project/app/routes.d.ts')).toBe(false)
  })
})

describe(isPathInsideDirectory, () => {
  it('only matches real descendants of the router root', () => {
    const routerRoot = path.resolve('/project/app')

    expect(isPathInsideDirectory('/project/app/index.tsx', routerRoot)).toBe(true)
    expect(isPathInsideDirectory('/project/app-copy/index.tsx', routerRoot)).toBe(false)
    expect(isPathInsideDirectory('/project/app', routerRoot)).toBe(false)
  })
})

describe(isRouteFileWatchEvent, () => {
  const routerRoot = path.resolve('/project/app')

  it('matches route file add and delete events', () => {
    expect(
      isRouteFileWatchEvent({
        event: 'add',
        filePath: '/project/app/index.tsx',
        routerRoot,
      })
    ).toBe(true)
    expect(
      isRouteFileWatchEvent({
        event: 'delete',
        filePath: '/project/app/nested/page.jsx',
        routerRoot,
      })
    ).toBe(true)
    expect(
      isRouteFileWatchEvent({
        event: 'unlink',
        filePath: '/project/app/nested/page.jsx',
        routerRoot,
      })
    ).toBe(true)
  })

  it('ignores non-route file add and delete events', () => {
    expect(
      isRouteFileWatchEvent({
        event: 'add',
        filePath: '/project/app/tamagui.generated.css',
        routerRoot,
      })
    ).toBe(false)
    expect(
      isRouteFileWatchEvent({
        event: 'delete',
        filePath: '/project/app/routes.d.ts',
        routerRoot,
      })
    ).toBe(false)
  })

  it('only matches change events when requested', () => {
    expect(
      isRouteFileWatchEvent({
        event: 'change',
        filePath: '/project/app/index.tsx',
        routerRoot,
      })
    ).toBe(false)
    expect(
      isRouteFileWatchEvent({
        event: 'change',
        filePath: '/project/app/index.tsx',
        routerRoot,
        includeChangeEvents: true,
      })
    ).toBe(true)
  })
})
