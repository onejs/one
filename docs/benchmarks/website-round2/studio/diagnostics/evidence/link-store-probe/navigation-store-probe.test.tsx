import React from 'react'
import TestRenderer, { act } from 'react-test-renderer'
import { expect, it } from 'vitest'
import { usePathname } from '../hooks'
import { Root } from '../Root'
import { push, routeInfoSnapshot, subscribeToStore } from '../router/router'
import { Slot } from '../views/Navigator'
import { useLinkTo } from './useLinkTo'

;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
;(globalThis as any).requestAnimationFrame ??= (cb: any) => setTimeout(() => cb(0), 0)
;(globalThis as any).cancelAnimationFrame ??= (id: any) => clearTimeout(id)

it('measures link renders and router store publications during real navigation', async () => {
  let linkRenders = 0
  let storePublications = 0
  const paths: string[] = []
  const LinkProbe = React.memo(() => {
    linkRenders++
    useLinkTo({ href: '/other' })
    return null
  })
  function Layout() {
    const pathname = usePathname()
    if (paths.at(-1) !== pathname) paths.push(pathname)
    return <><LinkProbe /><Slot /></>
  }
  globalThis['__vxrnVersion'] = ((globalThis['__vxrnVersion'] as number) ?? 0) + 1
  const routes = {
    '/app/_layout.tsx': { default: Layout },
    '/app/index.tsx': { default: () => 'home' },
    '/app/other.tsx': { default: () => 'other' },
  } as any
  let renderer!: TestRenderer.ReactTestRenderer
  await act(async () => {
    renderer = TestRenderer.create(<Root path="/" routes={routes} routerRoot="app" isClient={false} />)
  })
  const initialLinkRenders = linkRenders
  const unsubscribe = subscribeToStore(() => storePublications++)
  try {
    await act(async () => { await push('/other') })
    expect(routeInfoSnapshot().pathname).toBe('/other')
    await act(async () => { await push('/') })
    expect(routeInfoSnapshot().pathname).toBe('/')
    expect(paths).toEqual(['/', '/other', '/'])
    console.log(JSON.stringify({ initialLinkRenders, linkRenders, storePublications, paths }))
    expect(storePublications).toBe(0)
    expect(linkRenders).toBe(initialLinkRenders)
  } finally {
    unsubscribe()
    await act(async () => renderer.unmount())
  }
})
