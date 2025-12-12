import { type Scheme } from './systemScheme';
export type SchemeSetting = 'system' | 'light' | 'dark';
export type UserScheme = {
    /** The user's preference: 'system', 'light', or 'dark' */
    setting: SchemeSetting;
    /** The resolved scheme: 'light' or 'dark' */
    value: Scheme;
    /** Update the scheme setting */
    set: (setting: SchemeSetting) => void;
};
type SchemeListener = (setting: SchemeSetting, value: Scheme) => void;
export declare function setUserScheme(setting: SchemeSetting): void;
export declare function getUserScheme(): {
    setting: SchemeSetting;
    value: Scheme;
};
export declare function onUserSchemeChange(listener: SchemeListener): () => void;
export declare function useUserScheme(): UserScheme;
export {};
//# sourceMappingURL=userScheme.d.ts.map