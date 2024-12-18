import './setup';
export type CreateAppProps = {
    routes: Record<string, () => Promise<unknown>>;
};
export declare function createApp(options: CreateAppProps): any;
//# sourceMappingURL=createApp.d.ts.map