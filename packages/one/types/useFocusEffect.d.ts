type EffectCallback = () => undefined | void | (() => void)
/**
 * Hook to run an effect in a focused screen, similar to `React.useEffect`.
 * This can be used to perform side-effects such as fetching data or subscribing to events.
 *
 * @param callback Memoized callback containing the effect, should optionally return a cleanup function.
 */
export declare function useFocusEffect(effect: EffectCallback, args: any[]): void
export {}
//# sourceMappingURL=useFocusEffect.d.ts.map
