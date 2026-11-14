import type { DocumentPickerOptions, DocumentPickerResult } from './types.js';
export type * from './types.js';
declare function getDocument(options?: DocumentPickerOptions): Promise<DocumentPickerResult>;
export declare const DocumentPicker: Readonly<{
    getDocument: typeof getDocument;
}>;
//# sourceMappingURL=index.native.d.ts.map