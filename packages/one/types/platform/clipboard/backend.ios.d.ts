declare function clearClipboardListener(): void;
export declare function clipboardNative(): {
    getString(options: import("../specs/OneClipboard.nitro").ClipboardGetStringOptions): Promise<string>;
    setString(text: string, options: import("../specs/OneClipboard.nitro").ClipboardSetStringOptions): Promise<true>;
    hasString(): Promise<boolean>;
    getImage(options: import("../specs/OneClipboard.nitro").ClipboardGetImageOptions): Promise<{
        data: string;
        width: number;
        height: number;
    } | undefined>;
    setImage(base64Image: string): Promise<void>;
    hasImage(): Promise<boolean>;
    getUrl(): Promise<string | undefined>;
    setUrl(url: string): Promise<void>;
    hasUrl(): Promise<boolean>;
    setClipboardListener(next: (contentTypes: string[]) => void): void;
    clearClipboardListener: typeof clearClipboardListener;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map