import type { LocalAuthenticationStatus } from '../specs/OneLocalAuthentication.nitro';
declare function canEvaluatePolicy(): LocalAuthenticationStatus;
declare function evaluatePolicy(reason: string): Promise<boolean>;
export declare function localAuthenticationNative(): {
    canEvaluatePolicy: typeof canEvaluatePolicy;
    evaluatePolicy: typeof evaluatePolicy;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map