export declare function loadEnv(mode: 'production' | 'development', root?: string): Promise<{
    serverEnv: Record<string, string>;
    clientEnv: Record<string, string>;
    clientEnvDefine: {
        [k: string]: string;
    };
}>;
//# sourceMappingURL=loadEnv.d.ts.map