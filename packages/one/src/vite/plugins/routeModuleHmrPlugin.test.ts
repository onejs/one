import { describe, expect, it, vi } from 'vitest'
import { createRouteModuleHmrPlugin } from './routeModuleHmrPlugin'

function runHotUpdate({
  environment,
  file,
  modules,
}: {
  environment: 'client' | 'ssr'
  file: string
  modules: Array<{ id?: string; acceptedHmrExports?: Set<string> }>
}) {
  const plugin = createRouteModuleHmrPlugin('app-sootsim')
  const send = vi.fn()
  const hotUpdate =
    typeof plugin.hotUpdate === 'object' ? plugin.hotUpdate.handler : plugin.hotUpdate
  const result = hotUpdate!.call(
    { environment: { name: environment } } as never,
    {
      file,
      modules,
      server: {
        config: { root: '/project' },
        hot: { send },
      },
    } as never
  )
  return { result, send }
}

describe(createRouteModuleHmrPlugin, () => {
  it('applies client hmr to the configured router root', () => {
    const routeModule: { id: string; acceptedHmrExports?: Set<string> } = {
      id: '/project/app-sootsim/_layout.tsx?one',
    }
    const otherModule: { id: string; acceptedHmrExports?: Set<string> } = {
      id: '/project/app/index.tsx',
    }
    const { result, send } = runHotUpdate({
      environment: 'client',
      file: '/project/app-sootsim/_layout.tsx',
      modules: [routeModule, otherModule],
    })

    expect(result).toEqual([routeModule, otherModule])
    expect(routeModule.acceptedHmrExports).toEqual(new Set())
    expect(otherModule.acceptedHmrExports).toBeUndefined()
    expect(send).toHaveBeenCalledWith({
      type: 'custom',
      event: 'one:route-update',
      data: { file: 'app-sootsim/_layout.tsx' },
    })
  })

  it('suppresses ssr reloads only inside the configured router root', () => {
    const modules = [{ id: '/project/app-sootsim/index.tsx' }]

    expect(
      runHotUpdate({
        environment: 'ssr',
        file: '/project/app-sootsim/index.tsx',
        modules,
      }).result
    ).toEqual([])
    expect(
      runHotUpdate({
        environment: 'ssr',
        file: '/project/app/index.tsx',
        modules,
      }).result
    ).toEqual(modules)
  })
})
