import { toNodeListener } from 'h3'
import { createServer } from 'node:http'
import type { VXRNConfig } from '../types'
import { createProdServer } from './createServer'
import { getOptionsFilled } from '../utils/getOptionsFilled'

export const serve = async (optionsIn: VXRNConfig) => {
  const options = await getOptionsFilled(optionsIn)
  const app = await createProdServer(options)
  const server = createServer(toNodeListener(app))
  server.listen()
  console.info(`Listening on http://localhost:${options.port}`)
  await new Promise<void>((res) => {
    server.on('close', () => {
      res()
    })
  })
}
