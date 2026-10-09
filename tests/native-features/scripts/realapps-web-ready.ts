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
  // a redirected log is appended by another process, which fs.watch does not always report
  const interval = setInterval(() => void check(), 500)
  let complete = false
  function finish(error?: Error) {
    if (complete) return
    complete = true
    clearTimeout(timer)
    clearInterval(interval)
    watcher.close()
    error ? reject(error) : resolve()
  }
  let checking = false
  async function check() {
    if (checking || complete) return
    checking = true
    try {
      await read()
    } finally {
      checking = false
    }
  }
  async function read() {
    const output = readFileSync(logfile, 'utf8')
    if (/Port \d+ is already in use|(?:^|\n)Error:/.test(output))
      return finish(new Error(output.trim()))
    // plugins print their own urls before the server listens; wait for its Local line
    if (!/Local:\s+http:\/\//.test(output)) return
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (!response.ok) return finish(new Error(`${url}: HTTP ${response.status}`))
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
