import { type State } from '../fork/getPathFromState.js';
import type { OneRouter } from '../interfaces/router.js';
import { type UrlObject } from './getNormalizedStatePath.js';
export declare function getRouteInfo(state: OneRouter.ResultState): UrlObject;
export declare function getRouteInfoFromState(getPathFromState: (state: State, asPath: boolean) => {
    path: string;
    params: any;
}, state: State, baseUrl?: string): UrlObject;
//# sourceMappingURL=getRouteInfo.d.ts.map