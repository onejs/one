import { appendFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
const evidence = resolve(process.argv[2] || 'protected-store-runtime/evidence')
mkdirSync(evidence, { recursive: true })
let client: any
const pending = new Map<string, { resolve: (response: Response) => void; timer: Timer }>()
const log = (value: unknown) => appendFileSync(`${evidence}/events.jsonl`, JSON.stringify({ time: new Date().toISOString(), ...value as object }) + '\n')
Bun.serve({
  port: 8132,
  fetch: async (request, server) => {
    if (server.upgrade(request)) return
    if (new URL(request.url).pathname === '/command' && request.method === 'POST') {
      if (!client) return new Response('host is not connected', { status: 409 })
      const command = await request.json()
      if (pending.has(command.id)) return new Response('duplicate command id', { status: 409 })
      log({ event: 'command', ...command })
      return new Promise<Response>((resolve) => {
        const timer = setTimeout(() => { pending.delete(command.id); resolve(new Response('native result missing', { status: 504 })) }, 15000)
        pending.set(command.id, { resolve, timer })
        client.send(JSON.stringify(command))
      })
    }
    return Response.json({ connected: !!client, pending: [...pending.keys()] })
  },
  websocket: {
    open(socket) { client = socket },
    close(socket) { if (client === socket) client = undefined },
    message(_socket, data) {
      const value = JSON.parse(String(data))
      log(value)
      const call = pending.get(value.id)
      if (call) { clearTimeout(call.timer); pending.delete(value.id); call.resolve(Response.json(value)) }
    },
  },
})
