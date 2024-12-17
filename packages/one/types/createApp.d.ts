import './setup';
import type { RenderAppProps } from './types';
export type CreateAppProps = {
    routes: Record<string, () => Promise<unknown>>;
};
export declare function createApp(options: CreateAppProps): Promise<void> | {
    options: CreateAppProps;
    render: (props: RenderAppProps) => Promise<string>;
};
//# sourceMappingURL=createApp.d.ts.map