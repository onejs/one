import type { InlineConfig } from 'vite';
import type { Options as FlowOptions } from '@vxrn/vite-flow';
export type VXRNConfig = {
    root?: string;
    host?: string;
    port?: number;
    webConfig?: InlineConfig;
    buildConfig?: InlineConfig;
    flow?: FlowOptions;
};
export type HMRListener = (update: {
    file: string;
    contents: string;
}) => void;
//# sourceMappingURL=types.d.ts.map