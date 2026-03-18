import type { NavigationState, PartialState } from '@react-navigation/native';
type AnyState = NavigationState | PartialState<NavigationState>;
/**
 * removes specified params from all routes at every nesting level of a navigation state
 */
export declare function removeParams<T extends AnyState>(state: T, paramNames: string[]): T;
export {};
//# sourceMappingURL=removeParams.d.ts.map