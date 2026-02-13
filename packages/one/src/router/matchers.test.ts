import { describe, expect, it } from 'vitest'
import {
  getNameFromFilePath,
  matchArrayGroupName,
  matchDeepDynamicRouteName,
  matchDirectoryRenderMode,
  matchDynamicName,
  matchGroupName,
  stripGroupSegmentsFromPath,
} from './matchers'

describe(stripGroupSegmentsFromPath, () => {
  it(`strips group segments, preserving initial slash`, () => {
    expect(stripGroupSegmentsFromPath('/[[...foobar]]/(foo)/bar/[bax]/(other)')).toBe(
      '/[[...foobar]]/bar/[bax]'
    )
    expect(stripGroupSegmentsFromPath('(foo)/(bar)')).toBe('')
  })
})

describe(matchGroupName, () => {
  it(`matches`, () => {
    expect(matchGroupName('[[...foobar]]')).toEqual(undefined)
    expect(matchGroupName('[[foobar]]')).toEqual(undefined)
    expect(matchGroupName('[...foobar]')).toEqual(undefined)
    expect(matchGroupName('[foobar]')).toEqual(undefined)
    expect(matchGroupName('(foobar)')).toEqual('foobar')
    expect(matchGroupName('(foo,bar)')).toEqual('foo,bar')
    expect(matchGroupName('((foobar))')).toEqual('(foobar)')
    expect(matchGroupName('(...foobar)')).toEqual('...foobar')
    expect(matchGroupName('foobar')).toEqual(undefined)
    expect(matchGroupName('leading/foobar')).toEqual(undefined)
    expect(matchGroupName('leading/(foobar)')).toEqual('foobar')
    expect(matchGroupName('leading/((foobar))')).toEqual('(foobar)')
    expect(matchGroupName('leading/(...foobar)')).toEqual('...foobar')
    expect(matchGroupName('leading/(foo,bar)')).toEqual('foo,bar')
    expect(matchGroupName('leading/foobar/trailing')).toEqual(undefined)
    expect(matchGroupName('leading/(foobar)/trailing')).toEqual('foobar')
    expect(matchGroupName('leading/((foobar))/trailing')).toEqual('(foobar)')
    expect(matchGroupName('leading/(...foobar)/trailing')).toEqual('...foobar')
    expect(matchGroupName('leading/(foo,bar)/trailing)')).toEqual('foo,bar')
    expect(matchGroupName('leading/(foo,bar)/(fruit,apple)')).toEqual('foo,bar')
  })
})

describe(matchDynamicName, () => {
  it(`matches`, () => {
    expect(matchDynamicName('[[...foobar]]')).toEqual(undefined)
    expect(matchDynamicName('[[foobar]]')).toEqual(undefined)
    expect(matchDynamicName('[...foobar]')).toEqual({
      name: 'foobar',
      deep: true,
    })
    expect(matchDynamicName('[foobar]')).toEqual({
      name: 'foobar',
      deep: false,
    })
    expect(matchDynamicName('foobar')).toEqual(undefined)
  })
})

describe(matchDeepDynamicRouteName, () => {
  it(`matches`, () => {
    expect(matchDeepDynamicRouteName('[[...foobar]]')).toEqual(undefined)
    expect(matchDeepDynamicRouteName('[[foobar]]')).toEqual(undefined)
    expect(matchDeepDynamicRouteName('[...foobar]')).toEqual('foobar')
    expect(matchDeepDynamicRouteName('[foobar]')).toEqual(undefined)
    expect(matchDeepDynamicRouteName('foobar')).toEqual(undefined)
  })
})

describe(getNameFromFilePath, () => {
  it(`should return the name of the file`, () => {
    expect(getNameFromFilePath('./pages/home.tsx')).toBe('pages/home')
    expect(getNameFromFilePath('../pages/home.js')).toBe('pages/home')
    expect(getNameFromFilePath('./(home).jsx')).toBe('(home)')
    expect(getNameFromFilePath('../../../(pages)/[any]/[...home].ts')).toBe(
      '(pages)/[any]/[...home]'
    )
  })
})

describe(matchArrayGroupName, () => {
  it(`should not match routes without groups`, () => {
    expect(matchArrayGroupName('[[...foobar]]')).toEqual(undefined)
    expect(matchArrayGroupName('[[foobar]]')).toEqual(undefined)
    expect(matchArrayGroupName('[...foobar]')).toEqual(undefined)
    expect(matchArrayGroupName('[foobar]')).toEqual(undefined)
    expect(matchArrayGroupName('foobar')).toEqual(undefined)
    expect(matchArrayGroupName('leading/foobar')).toEqual(undefined)
    expect(matchArrayGroupName('leading/foobar/trailing')).toEqual(undefined)
  })
  it(`should not match routes with a single group`, () => {
    expect(matchArrayGroupName('(foobar)')).toEqual(undefined)
    expect(matchArrayGroupName('((foobar))')).toEqual(undefined)
    expect(matchArrayGroupName('(...foobar)')).toEqual(undefined)
    expect(matchArrayGroupName('leading/(foobar)')).toEqual(undefined)
    expect(matchArrayGroupName('leading/((foobar))')).toEqual(undefined)
    expect(matchArrayGroupName('leading/(...foobar)')).toEqual(undefined)
    expect(matchArrayGroupName('leading/(foobar)/trailing')).toEqual(undefined)
    expect(matchArrayGroupName('leading/((foobar))/trailing')).toEqual(undefined)
    expect(matchArrayGroupName('leading/(...foobar)/trailing')).toEqual(undefined)
    expect(matchArrayGroupName('(leading)/foobar')).toEqual(undefined)
    expect(matchArrayGroupName('(leading)/(foobar)')).toEqual(undefined)
    expect(matchArrayGroupName('(leading)/((foobar))')).toEqual(undefined)
    expect(matchArrayGroupName('(leading)/(...foobar)')).toEqual(undefined)
    expect(matchArrayGroupName('(leading)/foobar/trailing')).toEqual(undefined)
    expect(matchArrayGroupName('(leading)/(foobar)/trailing')).toEqual(undefined)
    expect(matchArrayGroupName('(leading)/((foobar))/trailing')).toEqual(undefined)
    expect(matchArrayGroupName('(leading)/(...foobar)/trailing')).toEqual(undefined)
  })
  it.skip(`should match routes with array group syntax`, () => {
    expect(matchArrayGroupName('(foo,bar)')).toEqual('foo,bar')
    expect(matchArrayGroupName('leading/(foo,bar)')).toEqual('foo,bar')
    expect(matchArrayGroupName('leading/(foo,bar)/trailing)')).toEqual('foo,bar')
    expect(matchArrayGroupName('leading/((foo),(bar))/trailing)')).toEqual('(foo),(bar)')
    expect(matchArrayGroupName('leading/(foo,bar)/(fruit,apple)')).toEqual('foo,bar')
    expect(matchArrayGroupName('(leading)/(foo,bar)')).toEqual('foo,bar')
    expect(matchArrayGroupName('(leading)/(foo,bar)/trailing)')).toEqual('foo,bar')
    expect(matchArrayGroupName('(leading)/((foo),(bar))/trailing)')).toEqual(
      '(foo),(bar)'
    )
  })
  it.skip(`should only match the first group with array group syntax`, () => {
    expect(matchArrayGroupName('(leading)/(foo,bar)/(fruit,apple)')).toEqual('foo,bar')
    expect(matchArrayGroupName('(leading)/((foo),bar)/(fruit,apple)')).toEqual(
      '(foo),bar'
    )
    expect(matchArrayGroupName('(leading)/(foo,bar)/((fruit),apple)')).toEqual('foo,bar')
  })
})

describe(matchDirectoryRenderMode, () => {
  it('should match directory names with render mode suffixes', () => {
    expect(matchDirectoryRenderMode('dashboard+ssr')).toEqual({
      name: 'dashboard',
      renderMode: 'ssr',
    })
    expect(matchDirectoryRenderMode('blog+ssg')).toEqual({
      name: 'blog',
      renderMode: 'ssg',
    })
    expect(matchDirectoryRenderMode('admin+spa')).toEqual({
      name: 'admin',
      renderMode: 'spa',
    })
    expect(matchDirectoryRenderMode('api-routes+api')).toEqual({
      name: 'api-routes',
      renderMode: 'api',
    })
  })

  it('should not match directory names without render mode suffixes', () => {
    expect(matchDirectoryRenderMode('dashboard')).toEqual(undefined)
    expect(matchDirectoryRenderMode('blog')).toEqual(undefined)
    expect(matchDirectoryRenderMode('admin')).toEqual(undefined)
  })

  it('should not match invalid render modes', () => {
    expect(matchDirectoryRenderMode('dashboard+invalid')).toEqual(undefined)
    expect(matchDirectoryRenderMode('blog+csr')).toEqual(undefined)
  })

  it('should handle directory names with hyphens and underscores', () => {
    expect(matchDirectoryRenderMode('my-dashboard+ssr')).toEqual({
      name: 'my-dashboard',
      renderMode: 'ssr',
    })
    expect(matchDirectoryRenderMode('my_blog+ssg')).toEqual({
      name: 'my_blog',
      renderMode: 'ssg',
    })
  })
})
