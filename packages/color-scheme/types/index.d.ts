import type { Scheme } from './systemScheme';
export type { Scheme } from './systemScheme';
export type { SchemeSetting, UserScheme } from './userScheme';
export { getSystemScheme, useSystemScheme } from './systemScheme';
export { getUserScheme, onUserSchemeChange, setUserScheme, useUserScheme, } from './userScheme';
export declare function SchemeProvider({ children, getClassName, defaultScheme, forceScheme, }: {
    children: any;
    getClassName?: (name: Scheme) => string;
    /** Force a default scheme when no user preference is stored. Without this, falls back to system preference. */
    defaultScheme?: Scheme;
    /** Lock the scheme to this value. Ignores user preference, system preference, and localStorage. Prevents hydration flicker. */
    forceScheme?: Scheme;
}): import("react/jsx-runtime").JSX.Element;
export declare function MetaTheme({ color, darkColor, lightColor, }: {
    color?: string;
    darkColor: string;
    lightColor: string;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=index.d.ts.map