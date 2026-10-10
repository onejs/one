import type { DocumentPickerOptions, DocumentPickerResult } from './types';
export type * from './types';
declare function getDocument(options?: DocumentPickerOptions): Promise<DocumentPickerResult>;
export declare const DocumentPicker: Readonly<{
    getDocument: typeof getDocument;
}>;
//# sourceMappingURL=index.native.d.ts.map