import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { backgroundComputationPlugin } from '../../../packages/vxrn/src/plugins/backgroundComputationPlugin.ts'

const root = resolve(import.meta.dirname, '..')
const server = await createServer({
  configFile: false,
  root,
  plugins: [backgroundComputationPlugin('web')],
  resolve: {
    alias: {
      'one/background': resolve(root, '../../packages/one/dist/esm/background.mjs'),
    },
  },
  server: { middlewareMode: true, hmr: false, ws: false },
})
try {
  assert.equal(
    typeof globalThis.Worker,
    'undefined',
    'this probe needs a server without Worker'
  )
  const { calculation } = await server.ssrLoadModule(
    '/fixtures/background-computation/definition.ts'
  )
  const { useBackgroundComputation } =
    await import('../../../packages/one/dist/esm/background.mjs')
  function Probe() {
    const result = useBackgroundComputation(calculation, { value: 7 })
    assert.equal(result.result, null)
    assert.equal(result.getCurrent(), null)
    return React.createElement('div', null, 'no worker during server rendering')
  }
  assert.equal(
    renderToString(React.createElement(Probe)),
    '<div>no worker during server rendering</div>'
  )
  console.log('RAN: server rendering returned null and did not require Worker')
} finally {
  await server.close()
}
