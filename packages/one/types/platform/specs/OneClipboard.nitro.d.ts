import type { HybridObject } from 'react-native-nitro-modules';
export interface ClipboardGetStringOptions {
    preferredFormat?: string;
}
export interface ClipboardSetStringOptions {
    inputFormat?: string;
}
export interface ClipboardSetStringOptions {
    inputFormat?: string;
}
export interface ClipboardGetImageOptions {
    format: string;
    jpegQuality?: number;
}
export interface ClipboardImageResult {
    data: string;
    width: number;
    height: number;
}
export interface OneClipboard extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getString(options: ClipboardGetStringOptions): Promise<string>;
    setString(text: string, options: ClipboardSetStringOptions): Promise<boolean>;
    hasString(): Promise<boolean>;
    getImage(options: ClipboardGetImageOptions): Promise<ClipboardImageResult | undefined>;
    setImage(base64Image: string): Promise<void>;
    hasImage(): Promise<boolean>;
    getUrl(): Promise<string | undefined>;
    setUrl(url: string): Promise<void>;
    hasUrl(): Promise<boolean>;
    setClipboardListener(listener: (contentTypes: string[]) => void): void;
    clearClipboardListener(): void;
}
//# sourceMappingURL=OneClipboard.nitro.d.ts.map