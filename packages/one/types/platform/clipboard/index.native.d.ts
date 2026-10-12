import type { ClipboardEvent, ClipboardGetImageOptions, ClipboardGetStringOptions, ClipboardImage, ClipboardSetStringOptions, ClipboardSubscription } from './types';
export type * from './types';
declare function getString(options?: ClipboardGetStringOptions): Promise<string>;
declare function setString(text: string, options?: ClipboardSetStringOptions): Promise<boolean>;
declare function hasString(): Promise<boolean>;
declare function getImage(options: ClipboardGetImageOptions): Promise<ClipboardImage | null>;
declare function setImage(base64Image: string): Promise<void>;
declare function hasImage(): Promise<boolean>;
declare function getUrl(): Promise<string | null>;
declare function setUrl(url: string): Promise<void>;
declare function hasUrl(): Promise<boolean>;
declare function addListener(listener: (event: ClipboardEvent) => void): ClipboardSubscription;
export declare const Clipboard: Readonly<{
    getString: typeof getString;
    setString: typeof setString;
    hasString: typeof hasString;
    getImage: typeof getImage;
    setImage: typeof setImage;
    hasImage: typeof hasImage;
    getUrl: typeof getUrl;
    setUrl: typeof setUrl;
    hasUrl: typeof hasUrl;
    addListener: typeof addListener;
}>;
//# sourceMappingURL=index.native.d.ts.map