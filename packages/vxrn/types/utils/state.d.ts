type State = {
    versionHash?: string;
};
export declare function readState(cacheDir: string): Promise<State>;
export declare function writeState(cacheDir: string, state: State): Promise<void>;
export {};
//# sourceMappingURL=state.d.ts.map