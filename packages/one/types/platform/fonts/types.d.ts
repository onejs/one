export type FontSource = number | string;
export type FontMap = Readonly<Record<string, FontSource>>;
export interface Fonts {
    load(fonts: FontMap): Promise<void>;
    isLoaded(name: string): boolean;
}
export type UseFontsResult = readonly [loaded: boolean, error: Error | null];
//# sourceMappingURL=types.d.ts.map