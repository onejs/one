declare function isEnabled(): Promise<boolean>;
declare function setEnabled(enabled: boolean): Promise<void>;
declare function activate(tag?: string): Promise<void>;
declare function deactivate(tag?: string): Promise<void>;
export declare function useKeepAwake(tag?: string): void;
export declare const KeepAwake: Readonly<{
    isEnabled: typeof isEnabled;
    setEnabled: typeof setEnabled;
    activate: typeof activate;
    deactivate: typeof deactivate;
}>;
export {};
//# sourceMappingURL=index.native.d.ts.map