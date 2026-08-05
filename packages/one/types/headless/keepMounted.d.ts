import type { ScreenEntry } from './types';
/**
 * Tabs and Drawer hold every route in navigation state from the start, so a
 * `keepMounted` screen must only stay mounted once it has actually been
 * focused. Matches react-navigation's lazy behavior on native.
 */
export declare function useVisitedScreens(focusedKey: string): string[];
export declare function renderKeptMountedScreens(screens: ScreenEntry[], visited: string[]): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=keepMounted.d.ts.map