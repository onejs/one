import type { HybridObject } from 'react-native-nitro-modules';
import type { ResolvedDocumentPickerOptions } from '../document-picker/options';
import type { DocumentPickerAsset } from '../document-picker/types';
export interface DocumentPickerNativeResult {
    canceled: boolean;
    assets?: DocumentPickerAsset[];
}
export interface OneDocumentPicker extends HybridObject<{
    ios: 'swift';
    android: 'kotlin';
}> {
    getDocument(options: ResolvedDocumentPickerOptions): Promise<DocumentPickerNativeResult>;
}
//# sourceMappingURL=OneDocumentPicker.nitro.d.ts.map