export type ControlledEvent = {
    eventCount: number;
    revision: number;
};
export declare function useControlled<T extends ControlledEvent>(onChange: (event: T) => void, revision?: number): {
    revision: number;
    acknowledgedEvent: number;
    onNativeChange(event: T): void;
};
//# sourceMappingURL=controlled.d.ts.map