import type { RollupOutput } from 'rollup'
import type { One } from '../../vite/types'
export declare const buildVercelOutputDirectory: ({
  apiOutput,
  buildInfoForWriting,
  clientDir,
  oneOptionsRoot,
  postBuildLogs,
}: {
  apiOutput: RollupOutput | null
  buildInfoForWriting: One.BuildInfo
  clientDir: string
  oneOptionsRoot: string
  postBuildLogs: string[]
}) => Promise<void>
//# sourceMappingURL=buildVercelOutputDirectory.d.ts.map
