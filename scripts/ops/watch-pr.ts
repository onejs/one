// watches a github PR until it is merged or closed.
// exit 0: PR merged
// exit 1: PR closed without merge, or error
// usage: bun scripts/ops/watch-pr.ts --pr <number> [--repo onejs/one]
//
// polls the api once a minute inside this process so the caller can sleep
// through it with `tm wait --exec` instead of burning turns.

const args = process.argv.slice(2)
const readFlag = (name: string) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

const prArg = readFlag('pr')
const repo = readFlag('repo') ?? 'onejs/one'
if (!prArg) {
  console.error('usage: bun scripts/ops/watch-pr.ts --pr <number> [--repo owner/name]')
  process.exit(2)
}

let consecutiveFetchFailures = 0

while (true) {
  const proc = Bun.spawnSync(
    ['gh', 'pr', 'view', prArg, '--repo', repo, '--json', 'state,mergedAt,title'],
    { env: { ...process.env, NO_COLOR: '1' } }
  )
  const stderr = proc.stderr.toString().trim()
  if (proc.exitCode !== 0) {
    consecutiveFetchFailures++
    console.error(`fetch failed (${consecutiveFetchFailures}/10): ${stderr}`)
    if (/HTTP 403|HTTP 429|rate limit/i.test(stderr)) {
      await new Promise((resolve) => setTimeout(resolve, 10 * 60_000))
      continue
    }
    if (consecutiveFetchFailures >= 10) process.exit(2)
    await new Promise((resolve) => setTimeout(resolve, 60_000))
    continue
  }
  consecutiveFetchFailures = 0
  const data = JSON.parse(proc.stdout.toString())
  if (data.state === 'MERGED') {
    console.log(`ok: PR #${prArg} (${data.title}) merged at ${data.mergedAt}`)
    process.exit(0)
  }
  if (data.state === 'CLOSED') {
    console.error(`failed: PR #${prArg} (${data.title}) closed without merging`)
    process.exit(1)
  }
  console.log(`waiting: PR #${prArg} state is ${data.state}...`)
  await new Promise((resolve) => setTimeout(resolve, 60_000))
}
