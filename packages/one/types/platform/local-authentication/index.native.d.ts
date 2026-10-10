import type { LocalAuthenticationStatus } from '../specs/OneLocalAuthentication.nitro';
export type { LocalAuthenticationStatus };
declare function canEvaluatePolicy(): LocalAuthenticationStatus;
declare function evaluatePolicy(reason: string): Promise<boolean>;
export declare const LocalAuthentication: Readonly<{
    canEvaluatePolicy: typeof canEvaluatePolicy;
    evaluatePolicy: typeof evaluatePolicy;
}>;
//# sourceMappingURL=index.native.d.ts.map