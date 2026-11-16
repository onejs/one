import type { KeyboardToolbarTheme } from '../types.js';
type ToolbarContextType = {
    theme: KeyboardToolbarTheme;
    isPrevDisabled: boolean;
    isNextDisabled: boolean;
};
export declare const ToolbarContext: import("react").Context<ToolbarContextType | undefined>;
export declare const useToolbarContext: () => ToolbarContextType;
export {};
//# sourceMappingURL=context.d.ts.map