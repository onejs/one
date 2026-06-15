export type BlockerState = 'unblocked' | 'blocked' | 'proceeding';
export type BlockerFunction = (args: {
    currentLocation: string;
    nextLocation: string;
    historyAction: 'push' | 'pop' | 'replace';
}) => boolean;
export type Blocker = {
    state: 'unblocked';
    reset?: undefined;
    proceed?: undefined;
    location?: undefined;
} | {
    state: 'blocked';
    reset: () => void;
    proceed: () => void;
    location: string;
} | {
    state: 'proceeding';
    reset?: undefined;
    proceed?: undefined;
    location: string;
};
/**
 * Block navigation when a condition is met.
 *
 * On native, this uses React Navigation's `usePreventRemove`, which registers the
 * route with the native stack so the iOS interactive swipe-back gesture is blocked
 * too (via `preventNativeDismiss`), not just JS-driven pops. A raw `beforeRemove`
 * listener only stops JS-driven pops, so swiping would bypass the guard and desync
 * JS<->native state. Note that this only works for navigation within the app - it
 * cannot prevent the app from being closed or backgrounded.
 *
 * @param shouldBlock - Either a boolean or a function that returns whether to block.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const [isDirty, setIsDirty] = useState(false)
 *   const blocker = useBlocker(isDirty)
 *
 *   return (
 *     <>
 *       <TextInput onChange={() => setIsDirty(true)} />
 *
 *       {blocker.state === 'blocked' && (
 *         <Modal>
 *           <Text>You have unsaved changes. Leave anyway?</Text>
 *           <Button title="Stay" onPress={blocker.reset} />
 *           <Button title="Leave" onPress={blocker.proceed} />
 *         </Modal>
 *       )}
 *     </>
 *   )
 * }
 * ```
 */
export declare function useBlocker(shouldBlock: BlockerFunction | boolean): Blocker;
/**
 * No-op on native - native uses React Navigation's usePreventRemove instead.
 * This is only used by the router on web.
 */
export declare function checkBlocker(_nextLocation: string, _historyAction?: 'push' | 'pop' | 'replace'): boolean;
//# sourceMappingURL=useBlocker.native.d.ts.map