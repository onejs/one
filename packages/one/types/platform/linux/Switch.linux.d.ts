export type SwitchProps = {
    isOn: boolean;
    revision?: number;
    onIsOnChange?: (event: {
        isOn: boolean;
        revision: number;
    }) => void;
};
export declare function Switch({ isOn, revision, onIsOnChange }: SwitchProps): import("react").JSX.Element;
//# sourceMappingURL=Switch.linux.d.ts.map