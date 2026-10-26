import type { NavigationState } from '@react-navigation/core';
import type { OneRouter } from '../../interfaces/router';
export declare function getNativeStackReplaceAction(actionState: OneRouter.ResultState, navigationState: NavigationState): {
    type: "REPLACE";
    payload: {
        readonly name: string;
        readonly params: object | undefined;
    };
    target: string;
    source: string;
} | null;
//# sourceMappingURL=getNativeStackReplaceAction.d.ts.map