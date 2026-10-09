// watches required github actions runs for one sha or a branch's current tip.
// exit 0: all runs completed successfully (or were skipped).
// exit 1: any run failed, was cancelled, or timed out.
// usage: bun scripts/ops/watch-ci.ts (--sha <sha> | --branch <branch>) [--repo onejs/one] [--workflow "Checks and Tests" ...]
// every named workflow must start and pass. branch mode follows superseding pushes.
//
// polls the api once a minute inside this process so the caller can sleep
// through it with `tm wait --exec` instead of burning turns.

const args = process.argv.slice(2)
const readFlag = (name: string) => {
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

const shaArg = readFlag('sha')
const branch = readFlag('branch')
const repo = readFlag('repo') ?? 'onejs/one'
const workflows = [
  ...new Set(
    args.flatMap((arg, index) => (arg === '--workflow' ? [args[index + 1]] : []))
  ),
]
if (
  (!shaArg && !branch) ||
  (shaArg && branch) ||
  workflows.some((name) => !name || name.startsWith('--'))
) {
  console.error(
    'usage: bun scripts/ops/watch-ci.ts (--sha <sha> | --branch <branch>) [--repo owner/name] [--workflow name ...]'
  )
  process.exit(2)
}

// `gh run list --commit` only matches the full 40-char sha
let sha = !shaArg
  ? ''
  : shaArg.length === 40
    ? shaArg
    : Bun.spawnSync(['git', 'rev-parse', '--verify', `${shaArg}^{commit}`], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
        .stdout.toString()
        .trim()
if (shaArg && !/^[0-9a-f]{40}$/.test(sha)) {
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

const env = { ...process.env, NO_COLOR: '1' }
delete env.FORCE_COLOR
delete env.CLICOLOR_FORCE
const branchHead = () =>
  Bun.spawnSync(
    ['gh', 'api', `repos/${repo}/git/ref/heads/${branch}`, '--jq', '.object.sha'],
    { env }
  )

async function waitAfterFetchFailure(stderr: string) {
  consecutiveFetchFailures++
  console.error(`fetch failed (${consecutiveFetchFailures}/10): ${stderr}`)
  if (/HTTP 403|HTTP 429|rate limit/i.test(stderr)) {
    await new Promise((resolve) => setTimeout(resolve, 10 * 60_000))
    return
  }
  if (consecutiveFetchFailures >= 10) process.exit(2)
  await new Promise((resolve) => setTimeout(resolve, 60_000))
}

while (true) {
  if (branch) {
    const head = branchHead()
    if (head.exitCode !== 0) {
      await waitAfterFetchFailure(head.stderr.toString().trim())
      continue
    }
    const nextSha = head.stdout.toString().trim()
    if (!/^[0-9a-f]{40}$/.test(nextSha)) {
      console.error(`invalid head for ${branch}: ${nextSha}`)
      process.exit(2)
    }
    if (sha !== nextSha) console.log(`following ${branch}: ${nextSha}`)
    sha = nextSha
  }
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
    await waitAfterFetchFailure(stderr)
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
      (run.event === 'push' ||
        run.event === 'workflow_dispatch' ||
        run.event === 'pull_request') &&
      (workflows.length === 0 || workflows.includes(run.name))
  )
  // duplicate push runs can be allocated ids out of order. a cancelled duplicate
  // has no verdict while another run for this exact workflow and sha still does.
  const candidates = direct.filter(
    (run) =>
      run.conclusion !== 'cancelled' ||
      !direct.some((other) => other.name === run.name && other.conclusion !== 'cancelled')
  )
  const latest = [
    ...new Map(
      candidates.sort((a, b) => a.databaseId - b.databaseId).map((run) => [run.name, run])
    ).values(),
  ]
  const failed = latest.filter((run) => run.conclusion && bad.has(run.conclusion))
  const pending = latest.filter((run) => run.status !== 'completed')
  const missing = workflows.filter((name) => !latest.some((run) => run.name === name))
  const complete = latest.length > 0 && pending.length === 0 && missing.length === 0
  // a push can supersede these runs between the head query and their verdict.
  if (branch && (failed.length > 0 || complete)) {
    const head = branchHead()
    if (head.exitCode !== 0) {
      await waitAfterFetchFailure(head.stderr.toString().trim())
      continue
    }
    if (head.stdout.toString().trim() !== sha) continue
  }
  if (failed.length > 0) {
    for (const run of failed) {
      console.error(`failed: ${run.name} (${run.conclusion}) run ${run.databaseId}`)
    }
    process.exit(1)
  }
  if (complete) {
    const unproven = latest.filter((run) => !ok.has(run.conclusion ?? ''))
    if (unproven.length > 0) {
      for (const run of unproven) {
        console.error(`unproven: ${run.name} (${run.conclusion}) run ${run.databaseId}`)
      }
      process.exit(1)
    }
    console.log(`verified source: ${sha}`)
    for (const run of latest) console.log(`ok: ${run.name} (${run.conclusion})`)
    process.exit(0)
  }
  console.log(
    `${latest.length - pending.length}/${latest.length + missing.length} complete`
  )
  await new Promise((resolve) => setTimeout(resolve, 60_000))
}
