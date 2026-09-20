export declare function buildNativeRunCommand(args: {
    platform: 'ios' | 'android';
    port?: number;
}): {
    command: string;
    argv: string[];
    port: number;
};
export type NativeRunSpawn = (executable: string, argv: string[], options: {
    cwd: string;
    stdio: 'inherit';
    env: NodeJS.ProcessEnv;
}) => void;
export declare function nativeRun({ root, platform, port, spawn, }: {
    root: string;
    platform: 'ios' | 'android';
    port?: number;
    spawn?: NativeRunSpawn;
}): Promise<void>;
//# sourceMappingURL=nativeRun.d.ts.map