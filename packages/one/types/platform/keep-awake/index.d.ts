export declare const KeepAwake: Readonly<{
    isEnabled: () => Promise<boolean>;
    setEnabled: (enabled: boolean) => Promise<void>;
    activate: (tag?: string) => Promise<void>;
    deactivate: (tag?: string) => Promise<void>;
}>;
export declare function useKeepAwake(tag?: string): void;
//# sourceMappingURL=index.d.ts.map