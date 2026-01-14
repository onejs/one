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
/**
 * Imperatively set the user's color scheme preference.
 * Persists to localStorage and updates all listeners.
 *
 * @param setting - 'system', 'light', or 'dark'
 */
export declare function setUserScheme(setting: SchemeSetting): void;
/**
 * Get the current user scheme setting and resolved value.
 *
 * @returns Object with setting and resolved value
 */
export declare function getUserScheme(): {
    setting: SchemeSetting;
    value: Scheme;
};
/**
 * Subscribe to color scheme changes. Listener is called immediately with current value.
 *
 * @param listener - Callback receiving (setting, value)
 * @returns Unsubscribe function
 */
export declare function onUserSchemeChange(listener: SchemeListener): () => void;
/**
 * Manage the user's color scheme preference with system detection and persistence.
 *
 * @returns Object with setting ('system'|'light'|'dark'), resolved value ('light'|'dark'), and set function
 * @link https://onestack.dev/docs/api/hooks/useUserScheme
 *
 * @example
 * ```tsx
 * const { setting, value, set } = useUserScheme()
 * // setting = 'system', value = 'dark' (resolved from OS)
 * set('light') // Switch to light mode
 * ```
 */
export declare function useUserScheme(): UserScheme;
export {};
//# sourceMappingURL=userScheme.d.ts.map