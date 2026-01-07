import { execSync, type SpawnOptions } from 'node:child_process'
export declare const exec: (
  cmd: string,
  options?: Parameters<typeof execSync>[1]
) => string
export declare const execPromise: (
  cmd: string,
  options?: SpawnOptions & {
    quiet?: boolean
  }
) => Promise<void>
export declare const execPromiseQuiet: (
  cmd: string,
  options?: SpawnOptions & {
    quiet?: boolean
  }
) => Promise<void>
//# sourceMappingURL=exec.d.ts.map
