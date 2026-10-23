export type ToggleProps = {
    label: string;
    isOn: boolean;
    revision?: number;
    onIsOnChange?: (event: {
        isOn: boolean;
        revision: number;
    }) => void;
};
export declare function Toggle({ label, isOn, revision, onIsOnChange }: ToggleProps): import("react").JSX.Element;
//# sourceMappingURL=Toggle.macos.d.ts.map