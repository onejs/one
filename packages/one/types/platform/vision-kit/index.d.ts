import type { VNDocumentCameraViewControllerDelegate, VNDocumentCameraViewControllerInstance } from './types.js';
export type * from './types.js';
export declare class VNDocumentCameraViewController implements VNDocumentCameraViewControllerInstance {
    static get isSupported(): boolean;
    delegate: VNDocumentCameraViewControllerDelegate<VNDocumentCameraViewController> | null;
    present(_animated?: boolean): Promise<void>;
    dismiss(_animated?: boolean): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map