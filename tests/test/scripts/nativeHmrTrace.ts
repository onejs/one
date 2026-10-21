import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DevEngine } from 'rolldown/experimental'
import { WebSocket, WebSocketServer } from 'ws'
import type { Plugin } from 'vite'

// temporary, opt-in capture for an edit that never reaches the running app.
export function nativeHmrTrace(path: string | undefined): Plugin {
  if (!path) return { name: 'test-native-hmr-trace' }
  mkdirSync(dirname(path), { recursive: true })
  const record = (event: string, detail: Record<string, unknown> = {}) => {
    appendFileSync(
      path,
      JSON.stringify({
        at: new Date().toISOString(),
        pid: process.pid,
        event,
        ...detail,
      }) + '\n'
    )
  }
  return {
    name: 'test-native-hmr-trace',
    api: {
      vxrnNative: () => ({
        name: 'test-native-hmr-trace-native',
        watchChange(id: string, change: unknown) {
          record('watch', { id, change })
        },
        transform(code: string, id: string) {
          if (id.includes('/features/hmr/')) {
            record('transform', {
              id,
              bytes: Buffer.byteLength(code),
              ready: code.includes('hmr-session-ready'),
            })
          }
          return null
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
      const pulse = setInterval(() => {
        const now = performance.now()
        record('pulse', { gapMs: now - lastPulse, ...process.memoryUsage() })
        lastPulse = now
      }, 1000)
      pulse.unref()
      const restorers: Array<() => void> = [() => clearInterval(pulse)]
      for (const method of [
        'registerClient',
        'ensureCurrentBuildFinish',
        'notifyPayloadDelivered',
      ] as const) {
        const original = DevEngine.prototype[method]
        ;(DevEngine.prototype[method] as any) = function (this: DevEngine, ...args: any[]) {
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
      WebSocketServer.prototype.emit = function (this: WebSocketServer, event, ...args: any[]) {
        const socket = args[0]
        if (event === 'connection' && socket.vxrnClientId) {
          const clientId = socket.vxrnClientId
          record('connection', { clientId })
          socket.on('close', (code: number, reason: Buffer) => {
            record('disconnect', { clientId, code, reason: String(reason) })
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
}
