export type LoaderTimingEntry = {
    path: string;
    startTime: number;
    moduleLoadTime?: number;
    executionTime?: number;
    totalTime?: number;
    error?: string;
    source: 'preload' | 'initial' | 'refetch';
};
export declare function getLoaderTimingHistory(): LoaderTimingEntry[];
/**
 * Imperatively refetch loader data for a given path.
 *
 * @param pathname - The route path to refetch (e.g., '/users/123')
 * @returns Promise that resolves when refetch completes
 * @link https://onestack.dev/docs/api/hooks/useLoaderState#refetchloader
 *
 * @example
 * ```tsx
 * await refetchLoader('/users/123')
 * ```
 */
export declare function refetchLoader(pathname: string): Promise<void>;
/**
 * Access loader data with full state control including refetch capability.
 * Use this when you need loading state or refetch; use `useLoader` for just data.
 *
 * @param loader - The loader function (optional - omit for just refetch/state)
 * @returns Object with data, state ('idle' | 'loading'), and refetch function
 * @link https://onestack.dev/docs/api/hooks/useLoaderState
 *
 * @example
 * ```tsx
 * const { data, state, refetch } = useLoaderState(loader)
 *
 * return (
 *   <div>
 *     {state === 'loading' && <Spinner />}
 *     <button onClick={refetch}>Refresh</button>
 *     <pre>{JSON.stringify(data)}</pre>
 *   </div>
 * )
 * ```
 */
export declare function useLoaderState<Loader extends Function = any, Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown>(loader?: Loader): Loader extends undefined ? {
    refetch: () => Promise<void>;
    state: 'idle' | 'loading';
} : {
    data: Returned extends Promise<any> ? Awaited<Returned> : Returned;
    refetch: () => Promise<void>;
    state: 'idle' | 'loading';
};
/**
 * Load route data with SSR/SSG support. Returns the loader's data directly.
 * For loading state and refetch capability, use `useLoaderState` instead.
 *
 * @param loader - The loader function exported from the route file
 * @returns The awaited return value of your loader function
 * @link https://onestack.dev/docs/api/hooks/useLoader
 *
 * @example
 * ```tsx
 * export async function loader({ params }) {
 *   return { user: await fetchUser(params.id) }
 * }
 *
 * export default function UserPage() {
 *   const { user } = useLoader(loader)
 *   return <div>{user.name}</div>
 * }
 * ```
 */
export declare function useLoader<Loader extends Function, Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned;
//# sourceMappingURL=useLoader.d.ts.map