import type { HybridObject } from 'react-native-nitro-modules';
import type { BrowserPresentationStyle, BrowserResult } from '../browser/types';
export type BrowserAuthResultType = 'cancel' | 'dismiss' | 'opened' | 'locked' | 'success';
export interface BrowserAuthResult {
    type: BrowserAuthResultType;
    url?: string;
}
export interface BrowserNativeOptions {
    presentationStyle?: BrowserPresentationStyle;
    browserPackage?: string;
    toolbarColor?: string;
    controlsColor?: string;
    showTitle?: boolean;
    preferEphemeralSession?: boolean;
}
export interface OneBrowser extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    open(url: string, options: BrowserNativeOptions): Promise<BrowserResult>;
    dismiss(): Promise<BrowserResult>;
    openAuthSession(url: string, redirectUrl: string | undefined, options: BrowserNativeOptions): Promise<BrowserAuthResult>;
    dismissAuthSession(): void;
}
//# sourceMappingURL=OneBrowser.nitro.d.ts.map