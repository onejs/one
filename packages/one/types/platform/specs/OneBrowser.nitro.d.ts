import type { HybridObject } from 'react-native-nitro-modules';
import type { BrowserColorScheme, BrowserPresentationStyle, BrowserResult } from '../browser/types';
export type BrowserAuthResultType = 'cancel' | 'dismiss' | 'opened' | 'locked' | 'success';
export interface BrowserAuthResult {
    type: BrowserAuthResultType;
    url?: string;
}
export interface BrowserNativeOptions {
    presentationStyle?: BrowserPresentationStyle;
    browserPackage?: string;
    toolbarColor?: string;
    secondaryToolbarColor?: string;
    controlsColor?: string;
    showTitle?: boolean;
    preferEphemeralSession?: boolean;
    colorScheme?: BrowserColorScheme;
}
export interface OneBrowser extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    open(url: string, options: BrowserNativeOptions): Promise<BrowserResult>;
    dismiss(): Promise<BrowserResult>;
    openAuthSession(url: string, redirectUrl: string | undefined, options: BrowserNativeOptions): Promise<BrowserAuthResult>;
    dismissAuthSession(): void;
    warmup(browserPackage?: string): Promise<boolean>;
    mayLaunchUrl(url: string, browserPackage?: string): Promise<boolean>;
}
//# sourceMappingURL=OneBrowser.nitro.d.ts.map