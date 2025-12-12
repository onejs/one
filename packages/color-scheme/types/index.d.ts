import type { Scheme } from './systemScheme';
export type { Scheme } from './systemScheme';
export type { SchemeSetting, UserScheme } from './userScheme';
export { getSystemScheme, useSystemScheme } from './systemScheme';
export { getUserScheme, onUserSchemeChange, setUserScheme, useUserScheme } from './userScheme';
export declare function SchemeProvider({ children, getClassName, }: {
    children: any;
    getClassName?: (name: Scheme) => string;
}): import("react/jsx-runtime").JSX.Element;
export declare function MetaTheme({ color, darkColor, lightColor, }: {
    color?: string;
    darkColor: string;
    lightColor: string;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=index.d.ts.map