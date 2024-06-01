import type { RenderAppProps } from './types';
export declare function createApp(options: {
    routes: Record<string, () => Promise<unknown>>;
}): {
    options: {
        routes: Record<string, () => Promise<unknown>>;
    };
    render: (props: RenderAppProps) => Promise<string>;
} | undefined;
//# sourceMappingURL=createApp.d.ts.map