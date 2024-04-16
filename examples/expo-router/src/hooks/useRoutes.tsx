import { routerStore } from '@vxrn/expo-router'

let ctx
let promise: Promise<void> | null = null

// for some reason putting it in state doesnt even re-render
export function useRoutes(modules: any) {
  if (!promise && !ctx) {
    promise = new Promise((res) => {
      loadRoutes(modules).then(() => {
        promise = null
        res()
      })
    })
  }

  if (promise) {
    throw promise
  }

  return ctx
}

export async function preloadRoutes(routes: any) {
  await loadRoutes(routes)
  return {
    context: ctx,
    routerStore,
  }
}

export async function loadRoutes(paths: any) {
  if (globalThis['__importMetaGlobbed']) {
    if (promise) await promise
    return ctx
  }

  globalThis['__importMetaGlobbed'] = paths

  // make it look like webpack context
  const modulesSync = {}
  await Promise.all(
    Object.keys(paths).map(async (path) => {
      modulesSync[path.replace('../app/', './')] = await paths[path]()
    })
  )
  const moduleKeys = Object.keys(modulesSync)
  function resolver(id: string) {
    return modulesSync[id]
  }
  resolver.keys = () => moduleKeys
  resolver.id = ''
  resolver.resolve = (id: string) => id
  ctx = resolver
  return ctx
}
