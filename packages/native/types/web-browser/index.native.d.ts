import { WebBrowserPresentationStyle, WebBrowserResultType, type WebBrowserAuthSessionOptions, type WebBrowserAuthSessionResult, type WebBrowserOpenOptions, type WebBrowserResult } from './types';
export { WebBrowserPresentationStyle, WebBrowserResultType };
export type { WebBrowserAuthSessionOptions, WebBrowserAuthSessionResult, WebBrowserOpenOptions, WebBrowserResult, };
export declare function openBrowserAsync(url: string, options?: WebBrowserOpenOptions): Promise<WebBrowserResult>;
export declare function dismissBrowser(): Promise<WebBrowserResult>;
export declare function openAuthSessionAsync(url: string, redirectUrl?: string | null, options?: WebBrowserAuthSessionOptions): Promise<WebBrowserAuthSessionResult>;
//# sourceMappingURL=index.native.d.ts.map