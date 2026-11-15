// runs compiled benchmarks in turn, rotating the order each round, and prints medians with their spread
// usage: bun measure.ts <rounds> <label>=<executable> ...
const [rounds, ...specs] = process.argv.slice(2)
const runs = specs.map((s) => ({ label: s.slice(0, s.indexOf('=')), bin: s.slice(s.indexOf('=') + 1), rows: [] as Record<string, number>[] }))
const rssMB = (bytes: number) => bytes / 1e6

for (let r = 0; r < Number(rounds); r++) {
  for (let k = 0; k < runs.length; k++) {
    const run = runs[(k + r) % runs.length]
    const p = Bun.spawnSync([run.bin])
    if (p.exitCode !== 0) throw new Error(`${run.label} exited ${p.exitCode}: ${p.stderr}`)
    const row: Record<string, number> = { user_ms: Number(p.resourceUsage.cpuTime.user) / 1000, max_rss_mb: rssMB(p.resourceUsage.maxRSS) }
    for (const [, k, v] of p.stdout.toString().matchAll(/(\w+)=([\d.]+)/g)) row[k] = Number(v)
    run.rows.push(row)
    console.error(run.label, JSON.stringify(row))
  }
}

const keys = ['mount_ms', 'update_ms', 'user_ms', 'max_rss_mb']
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b)
const median = (xs: number[]) => { const s = sorted(xs); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const base = runs[0]
console.log(['', ...keys].join('\t'))
for (const run of runs) {
  const cells = keys.map((k) => {
    const xs = run.rows.map((r) => r[k])
    const m = median(xs)
    const d = run === base ? '' : ` (${(((m - median(base.rows.map((r) => r[k]))) / median(base.rows.map((r) => r[k]))) * 100).toFixed(1)}%)`
    return `${m.toFixed(1)} [${sorted(xs)[0].toFixed(0)}..${sorted(xs).at(-1)!.toFixed(0)}]${d}`
  })
  console.log([run.label, ...cells].join('\t'))
}
