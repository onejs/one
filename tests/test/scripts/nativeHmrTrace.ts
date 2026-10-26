import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DevEngine } from 'rolldown/experimental'
import { WebSocket, WebSocketServer } from 'ws'
import type { Plugin } from 'vite'

// temporary, opt-in capture for an edit that never reaches the running app.
export function nativeHmrTrace(path: string | undefined): Plugin[] {
  if (!path) return [{ name: 'test-native-hmr-trace' }]
  mkdirSync(dirname(path), { recursive: true })
  const clients = new Set<string>()
  const edits = new Map<string, number>()
  let edit = 0
  let traceInvocation = 0
  const record = (event: string, detail: Record<string, unknown> = {}) => {
    appendFileSync(
      path,
      JSON.stringify({
        at: new Date().toISOString(),
        pid: process.pid,
        monotonicMs: performance.now(),
        cpu: process.cpuUsage(),
        clients: [...clients],
        event,
        ...detail,
      }) + '\n'
    )
  }
  const plugin: Plugin = {
    name: 'test-native-hmr-trace',
    api: {
      vxrnNativeCompilerTrace(id: string) {
        if (!id.includes('/features/hmr/')) return
        // snapshot the edit at invocation, even if another watch arrives mid-await.
        const edit = edits.get(id) ?? 0
        const transform = ++traceInvocation
        return (stage: string, status: 'start' | 'end' | 'error') => {
          const prefix =
            stage.startsWith('pre:') || stage.startsWith('load:') ? '' : 'compiler:'
          record(`${prefix}${stage}:${status}`, {
            id,
            edit,
            transform,
          })
        }
      },
      vxrnNative: () => ({
        name: 'test-native-hmr-trace-native',
        watchChange(id: string, change: unknown) {
          if (!id.includes('/features/hmr/')) return
          edits.set(id, ++edit)
          record('watch', { id, edit, change })
        },
        transform: {
          order: 'post',
          handler(code: string, id: string) {
            if (id.includes('/features/hmr/')) {
              record('transform', {
                id,
                edit: edits.get(id) ?? 0,
                bytes: Buffer.byteLength(code),
                ready: code.includes('hmr-session-ready'),
              })
            }
            return null
          },
        },
        moduleParsed({ id }: { id: string }) {
          if (!id.includes('/features/hmr/')) return
          record('moduleParsed', { id, edit: edits.get(id) ?? 0 })
        },
        generateBundle(_options: unknown, bundle: Record<string, any>) {
          for (const chunk of Object.values(bundle)) {
            if (chunk.type !== 'chunk' || !chunk.isEntry) continue
            // append after mapped code; do not shift any existing source-map line.
            chunk.code += `\n;(function() {
  var runtime = globalThis.__rolldown_runtime__;
  var apply = runtime.applyHmrUpdate;
  runtime.applyHmrUpdate = function(code, changedIds, seq) {
    var report = function(stage, detail) {
      try {
        runtime._socket.send(JSON.stringify({type:'hmr:trace', stage:stage, seq:seq, detail:detail}));
      } catch (error) { /* capture must not affect patch application */ }
    };
    report('apply:start', {bytes:code.length, ready:code.indexOf('hmr-session-ready') !== -1});
    try {
      var accepted = apply.call(this, code, changedIds, seq);
      report('apply:end', {accepted:accepted});
      return accepted;
    } catch (error) {
      report('apply:error', {message:String(error)});
      throw error;
    }
  };
})();\n`
            record('bundle', { bytes: Buffer.byteLength(chunk.code) })
          }
        },
      }),
    },
    configureServer(server) {
      // instrument the installed experimental engine only for this test process.
      let lastPulse = performance.now()
      let lastCpu = process.cpuUsage()
      const pulse = setInterval(() => {
        const now = performance.now()
        const cpu = process.cpuUsage()
        record('pulse', {
          gapMs: now - lastPulse,
          cpuDelta: {
            user: cpu.user - lastCpu.user,
            system: cpu.system - lastCpu.system,
          },
          ...process.memoryUsage(),
        })
        lastPulse = now
        lastCpu = cpu
      }, 1000)
      const restorers: Array<() => void> = [() => clearInterval(pulse)]
      for (const method of [
        'registerClient',
        'ensureCurrentBuildFinish',
        'notifyPayloadDelivered',
      ] as const) {
        const original = DevEngine.prototype[method]
        ;(DevEngine.prototype[method] as any) = function (
          this: DevEngine,
          ...args: any[]
        ) {
          const started = performance.now()
          record(`${method}:start`, { args })
          return (original as any).apply(this, args).then(
            (value: unknown) => {
              record(`${method}:end`, { args, ms: performance.now() - started })
              return value
            },
            (error: unknown) => {
              record(`${method}:error`, { args, message: String(error) })
              throw error
            }
          )
        }
        restorers.push(() => {
          ;(DevEngine.prototype[method] as any) = original
        })
      }
      const send = WebSocket.prototype.send
      WebSocket.prototype.send = function (this: WebSocket, data, ...args: any[]) {
        if (typeof data === 'string' && data.startsWith('{"type":"hmr:')) {
          const message = JSON.parse(data)
          record('send', {
            clientId: (this as any).vxrnClientId,
            type: message.type,
            seq: message.seq,
            bytes: Buffer.byteLength(data),
            ready: message.code?.includes('hmr-session-ready'),
          })
        }
        return (send as any).call(this, data, ...args)
      } as typeof send
      restorers.push(() => {
        WebSocket.prototype.send = send
      })
      const emit = WebSocketServer.prototype.emit
      WebSocketServer.prototype.emit = function (
        this: WebSocketServer,
        event,
        ...args: any[]
      ) {
        const socket = args[0]
        if (event === 'connection' && socket.vxrnClientId) {
          const clientId = socket.vxrnClientId
          clients.add(clientId)
          record('connection', { clientId })
          socket.on('close', (code: number, reason: Buffer) => {
            record('disconnect', { clientId, code, reason: String(reason) })
            clients.delete(clientId)
          })
          socket.on('message', (data: Buffer) => {
            const text = String(data)
            if (text.startsWith('{"type":"hmr:trace"')) {
              record('native', { clientId, ...JSON.parse(text) })
            }
          })
        }
        return emit.call(this, event, ...args)
      } as typeof emit
      restorers.push(() => {
        WebSocketServer.prototype.emit = emit
      })
      server.httpServer?.once('close', () => {
        for (const restore of restorers.reverse()) restore()
      })
    },
  }
  return [
    {
      name: 'test-native-hmr-trace-start',
      api: {
        vxrnNative: () => ({
          name: 'test-native-hmr-trace-start-native',
          // native codegen, background computation and client tree shaking ran first.
          // watch-to-start includes those earlier pre-ordered hooks; normal-order
          // transforms follow this marker.
          transform: {
            order: 'pre',
            handler(_code: string, id: string) {
              if (id.includes('/features/hmr/')) {
                record('transform:start', { id, edit: edits.get(id) ?? 0 })
              }
              return null
            },
          },
        }),
      },
    },
    plugin,
  ]
}
