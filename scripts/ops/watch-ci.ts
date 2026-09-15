// watches every github actions run for one sha to a terminal state.
// exit 0: all runs completed successfully (or were skipped).
// exit 1: any run failed, was cancelled, or timed out.
// usage: bun scripts/ops/watch-ci.ts --sha <sha> [--repo onejs/one]
//
// polls the api once a minute inside this process so the caller can sleep
// through it with `tm wait --exec` instead of burning turns.

const args = process.argv.slice(2)
const readFlag = (name: string) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

const shaArg = readFlag('sha')
const repo = readFlag('repo') ?? 'onejs/one'
if (!shaArg) {
  console.error('usage: bun scripts/ops/watch-ci.ts --sha <sha> [--repo owner/name]')
  process.exit(2)
}

// `gh run list --commit` only matches the full 40-char sha
const sha =
  shaArg.length === 40
    ? shaArg
    : Bun.spawnSync(['git', 'rev-parse', '--verify', `${shaArg}^{commit}`], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
        .stdout.toString()
        .trim()
if (!/^[0-9a-f]{40}$/.test(sha)) {
  console.error(`could not expand --sha ${shaArg} to a full commit`)
  process.exit(2)
}

const bad = new Set([
  'failure',
  'cancelled',
  'timed_out',
  'startup_failure',
  'action_required',
])
const ok = new Set(['success', 'skipped', 'neutral'])

let consecutiveFetchFailures = 0

while (true) {
  const env = { ...process.env, NO_COLOR: '1' }
  delete env.FORCE_COLOR
  delete env.CLICOLOR_FORCE
  const proc = Bun.spawnSync(
    [
      'gh',
      'run',
      'list',
      '--repo',
      repo,
      '--commit',
      sha,
      '--limit',
      '30',
      '--json',
      'name,status,conclusion,databaseId,event',
    ],
    { env }
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
  const runs: {
    name: string
    status: string
    conclusion: string | null
    databaseId: number
    event: string
  }[] = JSON.parse(proc.stdout.toString())

  // workflow_run / schedule children attach to the default-branch head and
  // crowd out the push that actually verifies this sha
  const direct = runs.filter(
    (run) =>
      run.event === 'push' ||
      run.event === 'workflow_dispatch' ||
      run.event === 'pull_request'
  )
  const failed = direct.filter((run) => run.conclusion && bad.has(run.conclusion))
  const pending = direct.filter((run) => run.status !== 'completed')
  if (failed.length > 0) {
    for (const run of failed) {
      console.error(`failed: ${run.name} (${run.conclusion}) run ${run.databaseId}`)
    }
    process.exit(1)
  }
  if (direct.length > 0 && pending.length === 0) {
    const unproven = direct.filter((run) => !ok.has(run.conclusion ?? ''))
    if (unproven.length > 0) {
      for (const run of unproven) {
        console.error(`unproven: ${run.name} (${run.conclusion}) run ${run.databaseId}`)
      }
      process.exit(1)
    }
    for (const run of direct) console.log(`ok: ${run.name} (${run.conclusion})`)
    process.exit(0)
  }
  console.log(`${direct.length - pending.length}/${direct.length} complete`)
  await new Promise((resolve) => setTimeout(resolve, 60_000))
}
