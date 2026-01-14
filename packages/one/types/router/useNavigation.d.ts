import { type NavigationProp } from '@react-navigation/native';
/**
 * Returns the React Navigation navigation object for the current route.
 * Provides low-level access to navigation actions, events, and screen options.
 *
 * @param parent - Optional path to parent navigator (absolute like `/(tabs)` or relative like `../`)
 * @returns The navigation object with methods like setOptions, addListener, getParent
 * @link https://onestack.dev/docs/api/hooks/useNavigation
 *
 * @example
 * ```tsx
 * const navigation = useNavigation()
 * navigation.setOptions({ title: 'My Screen' })
 * ```
 */
export declare function useNavigation<T = NavigationProp<ReactNavigation.RootParamList>>(parent?: string): T;
export declare function resolveParentId(contextKey: string, parentId?: string | null): string | null;
//# sourceMappingURL=useNavigation.d.ts.map