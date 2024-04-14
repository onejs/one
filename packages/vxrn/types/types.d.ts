import type { Options as FlowOptions } from '@vxrn/vite-flow';
import type { InlineConfig } from 'vite';
export type VXRNConfig = {
    entryNative?: string;
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