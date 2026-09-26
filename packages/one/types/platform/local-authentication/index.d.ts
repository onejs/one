import type { LocalAuthenticationStatus } from '../specs/OneLocalAuthentication.nitro';
export type { LocalAuthenticationStatus };
export declare const LocalAuthentication: Readonly<{
    canEvaluatePolicy: () => LocalAuthenticationStatus;
    evaluatePolicy: (_reason: string) => Promise<boolean>;
}>;
//# sourceMappingURL=index.d.ts.map