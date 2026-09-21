import { WebBrowserPresentationStyle, WebBrowserResultType, type WebBrowserAuthSessionOptions, type WebBrowserAuthSessionResult, type WebBrowserOpenOptions, type WebBrowserResult } from './types';
export { WebBrowserPresentationStyle, WebBrowserResultType };
export type { WebBrowserAuthSessionOptions, WebBrowserAuthSessionResult, WebBrowserOpenOptions, WebBrowserResult, };
export declare function openBrowserAsync(url: string, _options?: WebBrowserOpenOptions): Promise<WebBrowserResult>;
export declare function dismissBrowser(): Promise<WebBrowserResult>;
export declare function openAuthSessionAsync(url: string, _redirectUrl?: string | null, _options?: WebBrowserAuthSessionOptions): Promise<WebBrowserAuthSessionResult>;
//# sourceMappingURL=index.d.ts.map