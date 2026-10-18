import type { ResolvedDocumentPickerOptions } from './options';
import type { DocumentPickerNativeResult } from '../specs/OneDocumentPicker.nitro';
declare function getDocument(options: ResolvedDocumentPickerOptions): Promise<DocumentPickerNativeResult>;
export declare function documentPickerNative(_verb: string): {
    getDocument: typeof getDocument;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map