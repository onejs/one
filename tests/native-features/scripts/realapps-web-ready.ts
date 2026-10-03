import { watch, readFileSync } from 'node:fs'

const [url, logfile] = process.argv.slice(2)
if (!url || !logfile) throw new Error('Usage: realapps-web-ready.ts <url> <server-log>')
// wait for the server's ready event in its logfile, then require a real HTTP response.
await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(
    () => finish(new Error(`Server did not become ready: ${url}`)),
    60_000
  )
  const watcher = watch(logfile, () => {
    void check()
  })
  let complete = false
  function finish(error?: Error) {
    if (complete) return
    complete = true
    clearTimeout(timer)
    watcher.close()
    error ? reject(error) : resolve()
  }
  async function check() {
    const output = readFileSync(logfile, 'utf8')
    if (!/(?:http:\/\/|listening|packager-status:running)/i.test(output)) return
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!response.ok()) return finish(new Error(`${url}: HTTP ${response.status}`))
      if (
        url.endsWith('/status') &&
        !(await response.text()).includes('packager-status:running')
      )
        return finish(new Error('Expected the One native dev server'))
      finish()
    } catch (error) {
      finish(new Error(String(error)))
    }
  }
  void check()
})
console.log(`RAN server ready: ${url}`)
