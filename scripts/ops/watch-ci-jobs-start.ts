// watches one workflow run until every named job has started.
// exit 0: all named jobs are in_progress or completed (prove started).
// exit 1: the run completed before all named jobs started.
// exit 2: usage error or bounded fetch failures exhausted.
// usage: bun scripts/ops/watch-ci-jobs-start.ts --repo owner/name --run <id> --job "exact name" [--job "exact name" ...]
// every named job must start. polls `gh run view` once per 180s inside this
// process so the caller can sleep through it with `tm wait --exec`.
// performs no reruns or cancellations; it only observes.

export type WatchedJob = {
  name: string
  status: string
  conclusion: string | null
}

const startedStatuses = new Set(['in_progress', 'completed'])

export function evaluateJobsStart(jobs: WatchedJob[], wanted: string[]) {
  const startedNames = new Set(
    jobs.filter((job) => startedStatuses.has(job.status)).map((job) => job.name)
  )
  const pending = wanted.filter((name) => !startedNames.has(name))
  const missing = wanted.filter((name) => !jobs.some((job) => job.name === name))
  return { allStarted: pending.length === 0, pending, missing }
}

async function main() {
  const args = process.argv.slice(2)
  const readFlag = (name: string) => {
    const index = args.indexOf(`--${name}`)
    return index === -1 ? undefined : args[index + 1]
  }

  const repo = readFlag('repo') ?? 'onejs/one'
  const runId = readFlag('run')
  const wanted = [
    ...new Set(args.flatMap((arg, index) => (arg === '--job' ? [args[index + 1]] : []))),
  ]
  if (
    !runId ||
    !/^\d+$/.test(runId) ||
    wanted.length === 0 ||
    wanted.some((name) => !name || name.startsWith('--')) ||
    !repo ||
    repo.startsWith('--')
  ) {
    console.error(
      'usage: bun scripts/ops/watch-ci-jobs-start.ts --repo owner/name --run <id> --job "exact name" [--job "exact name" ...]'
    )
    process.exit(2)
  }

  let consecutiveFetchFailures = 0

  const env = { ...process.env, NO_COLOR: '1' }
  delete env.FORCE_COLOR
  delete env.CLICOLOR_FORCE

  async function waitAfterFetchFailure(stderr: string) {
    consecutiveFetchFailures++
    console.error(`fetch failed (${consecutiveFetchFailures}/10): ${stderr}`)
    if (/HTTP 403|HTTP 429|rate limit/i.test(stderr)) {
      await new Promise((resolve) => setTimeout(resolve, 10 * 60_000))
      return
    }
    if (consecutiveFetchFailures >= 10) process.exit(2)
    await new Promise((resolve) => setTimeout(resolve, 180_000))
  }

  while (true) {
    const proc = Bun.spawnSync(
      ['gh', 'run', 'view', runId, '--repo', repo, '--json', 'jobs,status,conclusion'],
      { env }
    )
    const stderr = proc.stderr.toString().trim()
    if (proc.exitCode !== 0) {
      await waitAfterFetchFailure(stderr)
      continue
    }
    let run: { jobs: WatchedJob[]; status: string; conclusion: string | null }
    try {
      run = JSON.parse(proc.stdout.toString())
    } catch (error) {
      await waitAfterFetchFailure(`unparsable run view: ${String(error)}`)
      continue
    }
    consecutiveFetchFailures = 0

    const { allStarted, pending, missing } = evaluateJobsStart(run.jobs, wanted)
    if (allStarted) {
      for (const name of wanted) {
        const job = run.jobs.find(
          (candidate) => candidate.name === name && startedStatuses.has(candidate.status)
        )
        console.log(`started: ${name} (${job?.status})`)
      }
      process.exit(0)
    }
    if (run.status === 'completed') {
      for (const name of pending) {
        console.error(`never started: ${name} (run ${run.conclusion ?? 'completed'})`)
      }
      process.exit(1)
    }
    const missingNote = missing.length > 0 ? ` missing: ${missing.join(', ')}` : ''
    console.log(
      `${wanted.length - pending.length}/${wanted.length} started; waiting: ${pending.join(', ')}${missingNote}`
    )
    await new Promise((resolve) => setTimeout(resolve, 180_000))
  }
}

if (import.meta.main) {
  await main()
}
