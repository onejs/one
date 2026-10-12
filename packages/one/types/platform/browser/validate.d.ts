import type { BrowserAuthSessionOptions, BrowserOpenOptions } from './types';
export declare function assertBrowserUrl(url: unknown, verb: string): asserts url is string;
export declare function assertRedirectUrl(redirectUrl: unknown, verb: string): asserts redirectUrl is string | null | undefined;
export declare function assertOpenOptions(options: unknown, verb: string): asserts options is BrowserOpenOptions | undefined;
export declare function assertAuthOptions(options: unknown, verb: string): asserts options is BrowserAuthSessionOptions | undefined;
//# sourceMappingURL=validate.d.ts.map