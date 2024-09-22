export type ColorSchemeName = 'light' | 'dark';
export type ColorSchemeSetting = ColorSchemeName | 'system';
export type ColorSchemeListener = (setting: ColorSchemeSetting, current: ColorSchemeName) => void;
export declare function setColorScheme(next: ColorSchemeSetting): void;
export declare function getColorScheme(): ColorSchemeName;
export declare function onColorSchemeChange(listener: ColorSchemeListener): () => void;
export declare function useColorScheme(): readonly ["light" | "dark", typeof setColorScheme];
export declare function useColorSchemeSetting(): readonly ["light" | "dark" | "system", typeof setColorScheme];
//# sourceMappingURL=colorScheme.d.ts.map