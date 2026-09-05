import { describe, expect, it } from 'vitest'
import { replaceLoader } from './replaceLoader'

describe('replaceLoader', () => {
  it('substitutes loader data into this route own stub', () => {
    const code = 'function n(){return"./(marketing)/compat/index+ssg.tsx"}export{n as loader};'
    const out = replaceLoader({
      code,
      loaderData: { details: { a: 1 } },
      routeId: './(marketing)/compat/index+ssg.tsx',
    })
    expect(out).toBe('function n(){return {"details":{"a":1}}}export{n as loader};')
  })

  it('targets its own stub when a chunk holds several routes', () => {
    const code =
      'function a(){return"./(marketing)/changelog/index+ssg.tsx"}function b(){return"./(marketing)/compat/index+ssg.tsx"}'
    const out = replaceLoader({
      code,
      loaderData: { ok: true },
      routeId: './(marketing)/compat/index+ssg.tsx',
    })
    expect(out).toContain('function a(){return"./(marketing)/changelog/index+ssg.tsx"}')
    expect(out).toContain('function b(){return {"ok":true}}')
  })

  it('throws instead of appending a second loader export when no stub matches', () => {
    // the stub carries a routeId built off the wrong router root, so appending
    // a loader export here would ship a module with a duplicate export
    const code =
      'function n(){return"./app-sootsim/(marketing)/compat/index+ssg.tsx"}export{n as loader};'
    expect(() =>
      replaceLoader({
        code,
        loaderData: { ok: true },
        routeId: './(marketing)/compat/index+ssg.tsx',
      })
    ).toThrow(/no loader stub for route ".\/\(marketing\)\/compat\/index\+ssg.tsx"/)
  })

  it('fills the old-style placeholder stub', () => {
    const code = 'export function loader() {return "__vxrn__loader__"};'
    const out = replaceLoader({
      code,
      loaderData: { ok: true },
      routeId: './index.tsx',
    })
    expect(out).toBe('export function loader() {return  {"ok":true}};')
  })
})
