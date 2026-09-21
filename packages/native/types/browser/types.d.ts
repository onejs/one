export type BrowserResultType = 'cancel' | 'dismiss' | 'opened' | 'locked';
export interface BrowserResult {
    type: BrowserResultType;
}
export interface BrowserRedirectResult {
    type: 'success';
    url: string;
}
export type BrowserAuthSessionResult = BrowserRedirectResult | BrowserResult;
export type BrowserPresentationStyle = 'automatic' | 'currentContext' | 'formSheet' | 'fullScreen' | 'overCurrentContext' | 'overFullScreen' | 'pageSheet' | 'popover';
export interface BrowserOpenOptions {
    presentationStyle?: BrowserPresentationStyle;
    browserPackage?: string;
    toolbarColor?: string;
    controlsColor?: string;
    showTitle?: boolean;
}
export interface BrowserAuthSessionOptions extends BrowserOpenOptions {
    preferEphemeralSession?: boolean;
}
//# sourceMappingURL=types.d.ts.map