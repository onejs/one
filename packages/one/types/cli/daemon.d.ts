export declare function daemon(args: {
    subcommand?: string;
    port?: string;
    host?: string;
    app?: string;
    slot?: string;
    project?: string;
    tui?: boolean;
}): Promise<void>;
export declare function openPlatform(platform: 'ios' | 'android'): Promise<void>;
//# sourceMappingURL=daemon.d.ts.map