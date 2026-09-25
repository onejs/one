import type { BrowserAuthSessionOptions, BrowserAuthSessionResult, BrowserOpenOptions, BrowserResult } from './types';
export type { BrowserAuthSessionOptions, BrowserAuthSessionResult, BrowserOpenOptions, BrowserPresentationStyle, BrowserRedirectResult, BrowserResult, BrowserResultType, } from './types';
declare function open(url: string, options?: BrowserOpenOptions): Promise<BrowserResult>;
declare function dismiss(): Promise<BrowserResult>;
declare function openAuthSession(url: string, redirectUrl?: string | null, options?: BrowserAuthSessionOptions): Promise<BrowserAuthSessionResult>;
declare function dismissAuthSession(): void;
export declare const Browser: Readonly<{
    open: typeof open;
    dismiss: typeof dismiss;
    openAuthSession: typeof openAuthSession;
    dismissAuthSession: typeof dismissAuthSession;
}>;
//# sourceMappingURL=index.native.d.ts.map