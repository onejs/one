import { spawn } from 'node:child_process'

/**
 * Tree-kill a spawned dev server together with the worker processes it forked,
 * cross-platform. Shared by the spawn-based tests in this directory so they all
 * clean up the same (correct) way — mirrors `killProcessTree` in
 * packages/test/src/setup.ts.
 *
 * POSIX: signal the whole process group via the negative PID. This requires the
 * server to have been spawned with `detached: true` so it leads its own group;
 * the workers it forks inherit that group and are signalled too. If the pid is
 * not a group leader the negative-pid call throws and we fall back to signalling
 * the single process. Pure Node — no shell-out.
 *
 * Windows: there is no process-group kill (`process.kill(-pid)` throws with
 * ESRCH), and `process.kill(pid)` maps to TerminateProcess, which ends only the
 * root — a worker that broke away from libuv's job object would be orphaned.
 * `taskkill /F /T` walks the PID tree and ends those workers too. (Node has no
 * built-in tree-kill, so this one shell-out is unavoidable for a robust result.)
 */
export function killProcessTree(pid: number | undefined): void {
  if (!pid) return

  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' })
    } catch {
      // process already gone — fine
    }
    return
  }

  // POSIX: graceful group SIGTERM, then a group SIGKILL fallback. The inner
  // fallbacks signal the single process when the pid is not a group leader.
  try {
    process.kill(-pid, 'SIGTERM')
  } catch {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // already gone
    }
  }
  setTimeout(() => {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // already gone
      }
    }
  }, 1000)
}
