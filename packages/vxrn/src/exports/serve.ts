import { toNodeListener } from 'h3'
import { createServer } from 'node:http'
import type { VXRNConfig } from '../types'
import { createProdServer } from './createServer'
import { getOptionsFilled } from '../utils/getOptionsFilled'

export const serve = async (optionsIn: VXRNConfig) => {
  const options = await getOptionsFilled(optionsIn, { mode: 'prod' })
  const app = await createProdServer(options)
  const server = createServer(toNodeListener(app))
  // strange prevents a cant listen on port issue
  await new Promise((res) => setTimeout(res, 1))
  server.listen(options.port)
  console.info(`Listening on http://localhost:${options.port}`)
  await new Promise<void>((res) => {
    server.on('close', () => {
      res()
    })
  })
}
