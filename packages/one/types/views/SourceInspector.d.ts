type ModifierKey = 'Alt' | 'Control' | 'Meta' | 'Shift';
type KeyboardKey = ModifierKey | (string & {});
export type SourceInspectorProps = {
    /**
     * The hotkey combination to activate the inspector.
     * Hold these keys and hover over elements to see their source location.
     * @default ['Shift', 'Meta'] on Mac, ['Shift', 'Control'] on Windows/Linux
     */
    hotkey?: KeyboardKey[];
    /**
     * Whether the source inspector is enabled
     * @default true in development
     */
    enabled?: boolean;
};
export declare function SourceInspector({ hotkey, enabled, }?: SourceInspectorProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=SourceInspector.d.ts.map