import type { ClipboardGetImageOptions, ClipboardGetStringOptions, ClipboardSetStringOptions } from './types';
export declare function assertSetStringText(text: unknown): asserts text is string;
export declare function assertSetStringOptions(options: ClipboardSetStringOptions | undefined, verb: string): void;
export declare function assertGetStringOptions(options: ClipboardGetStringOptions | undefined, verb: string): void;
export declare function assertSetImage(base64Image: unknown): asserts base64Image is string;
export declare function assertGetImageOptions(options: ClipboardGetImageOptions): void;
export declare function assertSetUrl(url: unknown): asserts url is string;
export declare function assertListener(listener: unknown): asserts listener is (event: {
    contentTypes: string[];
}) => void;
//# sourceMappingURL=validate.d.ts.map