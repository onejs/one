import { type NavigationProp, type NavigationState } from '../reactNavigationImports';
type GenericNavigation = NavigationProp<ReactNavigation.RootParamList> & {
    getState(): NavigationState | undefined;
};
/** Returns a callback which is invoked when the navigation state has loaded. */
export declare function useLoadedNavigation(): (fn: (navigation: GenericNavigation) => void) => void;
export declare function useOptionalNavigation(): GenericNavigation | null;
export {};
//# sourceMappingURL=useLoadedNavigation.d.ts.map