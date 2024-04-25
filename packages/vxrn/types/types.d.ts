import type { Options as FlowOptions } from '@vxrn/vite-flow';
import type { InlineConfig } from 'vite';
export type VXRNConfig = {
    /**
     * The entry points to your app. For web, it uses your `root` and looks for an index.html
     *
     * Defaults:
     *   native: ./src/entry-native.tsx
     *   server: ./src/entry-server.tsx
     */
    entries?: {
        native?: string;
        server?: string;
    };
    root?: string;
    host?: string;
    port?: number;
    webConfig?: InlineConfig;
    nativeConfig?: InlineConfig;
    flow?: FlowOptions;
};
export type HMRListener = (update: {
    file: string;
    contents: string;
}) => void;
//# sourceMappingURL=types.d.ts.map