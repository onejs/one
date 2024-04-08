import type { InlineConfig } from 'vite';
export type VXRNConfig = {
    root?: string;
    host?: string;
    port?: number;
    webConfig?: InlineConfig;
    buildConfig?: InlineConfig;
};
export type HMRListener = (update: {
    file: string;
    contents: string;
}) => void;
//# sourceMappingURL=types.d.ts.map