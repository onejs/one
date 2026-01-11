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
 * This is useful for preventing users from accidentally leaving a page with unsaved changes.
 * Works with both browser navigation (back/forward, URL changes) and programmatic navigation.
 *
 * @param shouldBlock - Either a boolean or a function that returns whether to block.
 *   When using a function, you receive the current and next locations and can make dynamic decisions.
 *
 * @example
 * ```tsx
 * function EditForm() {
 *   const [isDirty, setIsDirty] = useState(false)
 *   const blocker = useBlocker(isDirty)
 *
 *   return (
 *     <>
 *       <form onChange={() => setIsDirty(true)}>
 *         {// form fields}
 *       </form>
 *
 *       {blocker.state === 'blocked' && (
 *         <Dialog>
 *           <p>You have unsaved changes. Leave anyway?</p>
 *           <button onClick={blocker.reset}>Stay</button>
 *           <button onClick={blocker.proceed}>Leave</button>
 *         </Dialog>
 *       )}
 *     </>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Function-based blocking with location info
 * const blocker = useBlocker(({ currentLocation, nextLocation }) => {
 *   // Only block when leaving this specific section
 *   return currentLocation.startsWith('/edit') && !nextLocation.startsWith('/edit')
 * })
 * ```
 */
export declare function useBlocker(shouldBlock: BlockerFunction | boolean): Blocker;
//# sourceMappingURL=useBlocker.d.ts.map