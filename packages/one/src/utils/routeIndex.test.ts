import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createRouteIndex } from './routeIndex'

let testDir: string | undefined

function writeRoute(relativePath: string) {
  testDir ||= mkdtempSync(join(tmpdir(), 'one-route-index-'))
  const filePath = join(testDir, 'app', relativePath)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, 'export default function Route() { return null }')
  return filePath
}

afterEach(() => {
  if (testDir) {
    rmSync(testDir, { recursive: true, force: true })
    testDir = undefined
  }
})

describe(createRouteIndex, () => {
  it('scans and filters the route tree once', () => {
    writeRoute('index.tsx')
    writeRoute('nested/page.ts')
    writeRoute('nested/page.test.tsx')
    writeRoute('routes.d.ts')

    const routeIndex = createRouteIndex({
      routerRoot: join(testDir!, 'app'),
      ignoredRouteFiles: ['**/*.test.*'],
    })

    expect(routeIndex.getPaths()).toEqual(['./index.tsx', './nested/page.ts'])
  })

  it('updates route membership from watcher events', () => {
    writeRoute('index.tsx')
    const routeIndex = createRouteIndex({
      routerRoot: join(testDir!, 'app'),
      ignoredRouteFiles: ['**/*.test.*'],
    })
    const addedRoute = writeRoute('nested/new.tsx')
    const ignoredRoute = writeRoute('nested/new.test.tsx')

    expect(routeIndex.update('add', addedRoute)).toBe(true)
    expect(routeIndex.update('add', ignoredRoute)).toBe(false)
    expect(routeIndex.getPaths()).toEqual(['./index.tsx', './nested/new.tsx'])

    expect(routeIndex.update('unlink', addedRoute)).toBe(true)
    expect(routeIndex.getPaths()).toEqual(['./index.tsx'])
  })
})
