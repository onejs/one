import { describe, expect, it } from 'vitest'
import { getPathnameFromFilePath } from './getPathnameFromFilePath'

describe('getPathnameFromFilePath', () => {
  it('index route', () => {
    expect(getPathnameFromFilePath('/index+spa.tsx')).toBe('/')
  })

  it('simple page', () => {
    expect(getPathnameFromFilePath('/about+ssg.tsx')).toBe('/about')
  })

  it('dynamic param', () => {
    expect(getPathnameFromFilePath('/[serverId]/index+spa.tsx')).toBe('/:serverId/')
  })

  it('nested dynamic params', () => {
    expect(getPathnameFromFilePath('/[serverId]/[channelId]/index+spa.tsx')).toBe(
      '/:serverId/:channelId/'
    )
  })

  it('catch-all route without params', () => {
    expect(getPathnameFromFilePath('/docs/[...slug]+ssg.tsx')).toBe('/docs/*')
  })

  it('catch-all route with params', () => {
    expect(
      getPathnameFromFilePath('/docs/[...slug]+ssg.tsx', { slug: 'intro/basics' })
    ).toBe('/docs/intro/basics')
  })

  it('route groups are stripped', () => {
    expect(getPathnameFromFilePath('/(site)/(legal)/terms+ssg.tsx')).toBe('/terms')
  })

  it('nested path', () => {
    expect(getPathnameFromFilePath('/dashboard/settings/index+ssr.tsx')).toBe(
      '/dashboard/settings/'
    )
  })

  it('folder render mode suffix stripped', () => {
    expect(getPathnameFromFilePath('/folder+ssr/page+ssg.tsx')).toBe('/folder/page')
  })

  it('+not-found route', () => {
    expect(getPathnameFromFilePath('/not-found/+not-found+ssg.tsx')).toBe(
      '/not-found/+not-found'
    )
  })

  it('dynamic param with +not-found', () => {
    expect(getPathnameFromFilePath('/[slug]/+not-found+ssr.tsx')).toBe(
      '/:slug/+not-found'
    )
  })

  it('underscore-prefixed path segment', () => {
    expect(getPathnameFromFilePath('/_/home/index+spa.tsx')).toBe('/_/home/')
  })

  describe('input must start with / not ./', () => {
    // this is the key regression test: build.ts must strip the "./" prefix from
    // foundRoute.file before passing it here, otherwise routeMap keys end up
    // with "./" prefix while serve-time lookups use "/" prefix
    it('"./" prefix produces wrong keys', () => {
      const broken = getPathnameFromFilePath('./[serverId]/index+spa.tsx')
      expect(broken).toBe('./:serverId/')
      expect(broken).not.toBe('/:serverId/')
    })

    it('"/" prefix produces correct keys', () => {
      expect(getPathnameFromFilePath('/[serverId]/index+spa.tsx')).toBe('/:serverId/')
    })

    it('"./" root produces wrong key', () => {
      const broken = getPathnameFromFilePath('./index+spa.tsx')
      expect(broken).toBe('./')
      expect(broken).not.toBe('/')
    })

    it('"/" root produces correct key', () => {
      expect(getPathnameFromFilePath('/index+spa.tsx')).toBe('/')
    })
  })

  describe('with params substitution', () => {
    it('substitutes dynamic param', () => {
      expect(getPathnameFromFilePath('/ssr/[param]+ssr.tsx', { param: 'hello' })).toBe(
        '/ssr/hello'
      )
    })

    it('substitutes filename param, dirname params become placeholders', () => {
      // getPathnameFromFilePath only substitutes params in the filename segment,
      // dirname params are converted to :param placeholders via regex
      expect(
        getPathnameFromFilePath('/servers/[serverId]/[channelId]+spa.tsx', {
          serverId: 'abc',
          channelId: '123',
        })
      ).toBe('/servers/:serverId/123')
    })
  })

  describe('strict mode', () => {
    it('throws on missing param in strict mode', () => {
      expect(() => getPathnameFromFilePath('/[id]+ssr.tsx', {}, true)).toThrow(
        "Params doesn't fit route"
      )
    })

    it('returns placeholder in non-strict mode', () => {
      expect(getPathnameFromFilePath('/[id]+ssr.tsx', {}, false)).toBe('/:id')
    })
  })
})
