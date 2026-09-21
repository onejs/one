export declare const WebBrowserResultType: {
    readonly CANCEL: 'cancel';
    readonly DISMISS: 'dismiss';
    readonly OPENED: 'opened';
    readonly LOCKED: 'locked';
};
export type WebBrowserResultType = (typeof WebBrowserResultType)[keyof typeof WebBrowserResultType];
export interface WebBrowserResult {
    type: WebBrowserResultType;
}
export interface WebBrowserRedirectResult {
    type: 'success';
    url: string;
}
export type WebBrowserAuthSessionResult = WebBrowserRedirectResult | WebBrowserResult;
export declare const WebBrowserPresentationStyle: {
    readonly AUTOMATIC: 'automatic';
    readonly CURRENT_CONTEXT: 'currentContext';
    readonly FORM_SHEET: 'formSheet';
    readonly FULL_SCREEN: 'fullScreen';
    readonly OVER_CURRENT_CONTEXT: 'overCurrentContext';
    readonly OVER_FULL_SCREEN: 'overFullScreen';
    readonly PAGE_SHEET: 'pageSheet';
    readonly POPOVER: 'popover';
};
export type WebBrowserPresentationStyle = (typeof WebBrowserPresentationStyle)[keyof typeof WebBrowserPresentationStyle];
export interface WebBrowserOpenOptions {
    presentationStyle?: WebBrowserPresentationStyle;
    browserPackage?: string;
    toolbarColor?: string;
    controlsColor?: string;
    showTitle?: boolean;
}
export interface WebBrowserAuthSessionOptions extends WebBrowserOpenOptions {
    preferEphemeralSession?: boolean;
}
//# sourceMappingURL=types.d.ts.map