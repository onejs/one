type Mode = 'development' | 'production';
export declare function loadEnv(mode: Mode, root?: string, userPrefix?: string | string[]): Promise<{
    serverEnv: {
        [k: string]: string;
    };
    clientEnv: {
        [k: string]: string | undefined;
    };
    clientEnvDefine: {
        [k: string]: string;
    };
}>;
export {};
//# sourceMappingURL=loadEnv.d.ts.map