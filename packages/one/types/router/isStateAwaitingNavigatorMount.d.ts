import type { OneRouter } from '../interfaces/router';
import type { RouteNode } from './Route';
type PartialState = {
    index?: number;
    routes: Array<{
        name: string;
        state?: PartialState;
    }>;
};
/**
 * True when `state` stops short of the route the URL names because the
 * navigator that owns the rest of it is not mounted.
 *
 * React Navigation rebuilds the container state from the navigators that are
 * mounted right now: `useOnGetState` asks each one for its state and a route
 * whose navigator is absent gets `state: undefined`. So a layout that renders
 * anything other than its `<Slot />` — an auth gate, a loading state, an access
 * check, a late mount during hydration — makes the container publish a state
 * that is a TRUNCATION of the real location. Serializing that gives a pathname
 * the app is not on: `/project/x/main` reads as `/`.
 *
 * The URL did not change, only the tree did, so nothing derived from the URL
 * may move. A consumer that acts on the truncated pathname and in turn decides
 * whether to render the routed subtree oscillates forever.
 */
export declare function isStateAwaitingNavigatorMount(state: OneRouter.ResultState | PartialState | undefined, rootNode: RouteNode | null): boolean;
export {};
//# sourceMappingURL=isStateAwaitingNavigatorMount.d.ts.map