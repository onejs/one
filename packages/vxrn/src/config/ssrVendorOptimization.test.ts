import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createServer } from 'vite'
import { expect, it } from 'vitest'
import { getOptimizeDeps } from './getOptimizeDeps'

const require = createRequire(import.meta.url)

it('renders shared React without loading the vendored copies', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'vxrn-ssr-react-')))
  const modules = join(root, 'node_modules')
  mkdirSync(modules)
  writeFileSync(join(root, 'package.json'), '{"private":true}')
  for (const name of ['react', 'react-dom']) {
    const target = join(modules, name)
    cpSync(dirname(require.resolve(`${name}/package.json`)), target, {
      recursive: true,
      dereference: true,
    })
  }
  const vendor = join(modules, '@vxrn/vendor')
  mkdirSync(vendor, { recursive: true })
  const source = resolve(import.meta.dirname, '../../../vendor')
  cpSync(join(source, 'package.json'), join(vendor, 'package.json'))
  for (const name of ['react', 'react-dom']) {
    cpSync(join(source, name), join(vendor, name), { recursive: true })
  }
  writeFileSync(
    join(root, 'entry.js'),
    `import React, { useState } from 'react'
import { renderToString } from 'react-dom/server.browser'
function Page() {
  const [text] = useState('ready')
  return React.createElement('h1', null, text)
}
export const html = renderToString(React.createElement(Page))
`
  )
  const loadedVendor = new Set<string>()
  const { optimizeDeps } = getOptimizeDeps('serve')
  const include = optimizeDeps.include.filter((id) =>
    /^(react(?:-dom)?(?:\/|$)|@vxrn\/vendor\/react)/.test(id)
  )
  const server = await createServer({
    configFile: false,
    root,
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
    ssr: { noExternal: include },
    environments: {
      ssr: {
        resolve: { conditions: ['vxrn-web'] },
        optimizeDeps: {
          ...optimizeDeps,
          include: [...include, 'react-dom/server.browser'],
          noDiscovery: true,
          rolldownOptions: {
            ...optimizeDeps.rolldownOptions,
            plugins: [
              {
                name: 'record-vendored-react-loads',
                load(id) {
                  if (id.startsWith(vendor)) loadedVendor.add(id)
                },
              },
            ],
          },
        },
      },
    },
  })
  try {
    expect(server.environments.ssr.depsOptimizer).toBeDefined()
    await server.environments.ssr.listen(server)
    const result = await server.ssrLoadModule(join(root, 'entry.js'))
    expect(result.html).toBe('<h1>ready</h1>')
    expect([...loadedVendor]).toEqual([])
  } finally {
    await server.close()
    rmSync(root, { recursive: true, force: true })
  }
})
