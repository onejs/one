import type { NavigationState } from '@react-navigation/core';
import type { OneRouter } from '../../interfaces/router';
/**
 * Generates a navigation action to transition from the current state to the desired state.
 */
export declare function getNavigateAction(
/** desired state */
actionState: OneRouter.ResultState, navigationState: NavigationState, type?: string): {
    type: string;
    target: string;
    payload: {
        key: any;
        name: any;
        params: any;
    };
};
//# sourceMappingURL=getNavigateAction.d.ts.map