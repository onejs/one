export declare function buildNativeRunCommand(args: {
    platform: 'ios' | 'android';
    port?: number;
    simulator?: string;
    udid?: string;
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
export declare function nativeRun({ root, platform, port, simulator, udid, spawn, }: {
    root: string;
    platform: 'ios' | 'android';
    port?: number;
    simulator?: string;
    udid?: string;
    spawn?: NativeRunSpawn;
}): Promise<void>;
export declare function resolveIosBundleId(root: string): string | null;
//# sourceMappingURL=nativeRun.d.ts.map