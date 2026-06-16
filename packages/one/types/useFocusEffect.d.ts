type EffectCallback = () => undefined | void | (() => void);
/**
 * Run side effects when a screen is focused. The effect runs when the screen
 * gains focus and cleans up when it loses focus.
 *
 * @param effect - Memoized callback containing the effect, optionally returns cleanup function
 * @param deps - Optional dependency array, effect re-runs when dependencies change (if
 *   focused). Defaults to `[]` so a React-Navigation-style one-arg call
 *   (`useFocusEffect(useCallback(fn, []))`) works without crashing.
 * @link https://onestack.dev/docs/api/hooks/useFocusEffect
 *
 * @example
 * ```tsx
 * useFocusEffect(
 *   useCallback(() => {
 *     const subscription = subscribeToUpdates()
 *     return () => subscription.unsubscribe()
 *   }, []),
 *   []
 * )
 * ```
 */
export declare function useFocusEffect(effect: EffectCallback, deps?: any[]): void;
export {};
//# sourceMappingURL=useFocusEffect.d.ts.map