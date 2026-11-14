import type { VNDocumentCameraViewControllerDelegate, VNDocumentCameraViewControllerInstance } from './types.js';
export type * from './types.js';
export declare class VNDocumentCameraViewController implements VNDocumentCameraViewControllerInstance {
    static get isSupported(): boolean;
    delegate: VNDocumentCameraViewControllerDelegate<VNDocumentCameraViewController> | null;
    private readonly native;
    present(animated?: boolean): Promise<void>;
    dismiss(animated?: boolean): Promise<void>;
}
//# sourceMappingURL=index.native.d.ts.map