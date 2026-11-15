import type { RolldownOutput } from 'rolldown';
import type { One } from '../../vite/types.js';
export declare const buildVercelOutputDirectory: ({ apiOutput, buildInfoForWriting, clientDir, oneOptionsRoot, postBuildLogs, }: {
    apiOutput: RolldownOutput | null;
    buildInfoForWriting: One.BuildInfo;
    clientDir: string;
    oneOptionsRoot: string;
    postBuildLogs: string[];
}) => Promise<void>;
//# sourceMappingURL=buildVercelOutputDirectory.d.ts.map