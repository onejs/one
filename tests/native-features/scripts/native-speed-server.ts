import { createServer } from 'node:http'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { once } from 'node:events'

const output = resolve(process.argv[2] ?? 'proofs/native-speed')
const port = Number(process.env.ONE_SPEED_PORT ?? 4399)
mkdirSync(output, { recursive: true })
const photo = readFileSync(new URL('../assets/one-speed-12mp.jpg', import.meta.url))
const server = createServer(async (request, response) => {
  const url = new URL(request.url!, `http://localhost:${port}`)
  if (url.pathname === '/photo') {
    response.writeHead(200, {
      'content-type': 'image/jpeg',
      'content-length': photo.length,
    })
    response.end(photo)
    return
  }
  if (url.pathname === '/stream') {
    const paced = url.searchParams.get('paced') === '1'
    const count = paced ? 32 : 512
    response.writeHead(200, {
      'content-type': 'application/octet-stream',
      'cache-control': 'no-store',
    })
    response.flushHeaders()
    const started = performance.now()
    for (let index = 0; index < count; index++) {
      if (response.destroyed) return
      const frame = Buffer.alloc(65536, index & 255)
      frame.writeUInt32LE(index, 0)
      frame.writeDoubleLE(performance.now() - started, 4)
      if (!response.write(frame)) await once(response, 'drain')
      if (paced) await new Promise((resolve) => setTimeout(resolve, 5))
    }
    response.end()
    return
  }
  if (url.pathname === '/result' && request.method === 'POST') {
    const chunks: Buffer[] = []
    for await (const chunk of request) chunks.push(chunk)
    const result = JSON.parse(Buffer.concat(chunks).toString())
    if (!/^[a-z0-9-]+$/.test(result.device) || !/^[a-z0-9-]+$/.test(result.suite)) {
      response.writeHead(400).end('invalid result path')
      return
    }
    const file = resolve(output, `${result.device}-${result.suite}.json`)
    // every completed sample is saved before the next native workload starts.
    writeFileSync(file, JSON.stringify(result, null, 2) + '\n')
    console.log(
      `${file}: ${result.measurements?.length ?? 0} measurements; ${result.status}`
    )
    response.writeHead(200, { 'content-type': 'application/json' }).end('{"saved":true}')
    return
  }
  response.writeHead(404).end()
})
server.listen(port, '0.0.0.0', () =>
  console.log(`native speed server :${port}; results ${output}`)
)
