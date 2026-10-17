import { readFile } from 'node:fs/promises'
import { rolldown } from 'rolldown'
import { afterEach, expect, it, vi } from 'vitest'

const source = await readFile(new URL('./render.tsx', import.meta.url), 'utf8')

afterEach(() => {
  vi.unstubAllGlobals()
})

async function loadRenderer(environment: 'ssr' | 'client') {
  const calls: unknown[][] = []
  vi.stubGlobal('__renderCalls', calls)
  vi.stubGlobal('__vxrnRoot', undefined)
  const bundle = await rolldown({
    input: 'render.tsx',
    transform: {
      define: { 'process.env.VITE_ENVIRONMENT': JSON.stringify(environment) },
    },
    plugins: [
      {
        name: 'renderer-fixture',
        resolveId(id) {
          if (['render.tsx', 'react', 'react-dom/client'].includes(id)) return id
        },
        load(id) {
          if (id === 'render.tsx') return source
          if (id === 'react') return 'export const startTransition = (fn) => fn()'
          if (id === 'react-dom/client') {
            return `globalThis.__renderCalls.push(['client evaluated'])
export function createRoot(root) {
  globalThis.__renderCalls.push(['create', root])
  return { render(element) { globalThis.__renderCalls.push(['render', element]) } }
}
export function hydrateRoot(root, element) {
  globalThis.__renderCalls.push(['hydrate', root, element])
  return { render(element) { globalThis.__renderCalls.push(['render', element]) } }
}`
          }
        },
      },
    ],
  })
  try {
    const { output } = await bundle.generate({ format: 'cjs' })
    const result = { exports: {} as Record<string, any> }
    new Function('module', 'exports', output[0].code)(result, result.exports)
    const module = result.exports
    return { module, calls }
  } finally {
    await bundle.close()
  }
}

it('does not evaluate the browser renderer on the server', async () => {
  const { module, calls } = await loadRenderer('ssr')
  module.render('server')
  expect(calls).toEqual([])
})

it.each([false, true])('renders and updates the browser root (SPA: %s)', async (spa) => {
  const document = { documentElement: {} }
  vi.stubGlobal('document', document)
  vi.stubGlobal('__vxrnIsSPA', spa)
  const { module, calls } = await loadRenderer('client')
  const listener = vi.fn()
  module.afterClientRender(listener)
  module.render('first')
  module.render('second')
  expect(calls).toEqual([
    ['client evaluated'],
    ...(spa
      ? [
          ['create', document],
          ['render', 'first'],
        ]
      : [['hydrate', document, 'first']]),
    ['render', 'second'],
  ])
  expect(listener).toHaveBeenCalledTimes(2)
  const late = vi.fn()
  module.afterClientRender(late)
  expect(late).toHaveBeenCalledOnce()
})
