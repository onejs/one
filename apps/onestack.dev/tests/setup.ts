import { spawn } from 'node:child_process'
import { once } from 'node:events'

export default async function setup() {
  const production = process.env.TEST_ONLY === 'prod'
  const server = spawn(
    process.execPath,
    production
      ? ['scripts/serve-start.mjs']
      : ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '8081', '--strictPort'],
    { detached: true, env: { ...process.env, PORT: '8081' }, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  const stop = async () => {
    if (server.exitCode !== null || server.signalCode !== null) return
    const exited = once(server, 'exit')
    process.kill(-server.pid!, 'SIGTERM')
    await exited
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('site server did not become ready')), 30000)
      const ready = (data: Buffer) => {
        process.stdout.write(data)
        if (data.toString().includes('Local:')) {
          clearTimeout(timeout)
          resolve()
        }
      }
      server.stdout.on('data', ready)
      server.stderr.on('data', (data: Buffer) => process.stderr.write(data))
      server.once('error', (error) => { clearTimeout(timeout); reject(error) })
      server.once('exit', (code) => {
        clearTimeout(timeout)
        reject(new Error(`site server exited before readiness: ${code}`))
      })
    })
    const response = await fetch('http://localhost:8081')
    if (!response.ok) throw new Error(`site readiness returned ${response.status}`)
    return stop
  } catch (error) {
    await stop()
    throw error
  }
}
