type Mode = 'development' | 'production';
export declare function loadEnv(mode: Mode, root?: string): Promise<{
    serverEnv: {
        [k: string]: string;
    };
    clientEnv: {
        [k: string]: string;
    };
    clientEnvDefine: {
        [k: string]: string;
    };
}>;
export {};
//# sourceMappingURL=loadEnv.d.ts.map