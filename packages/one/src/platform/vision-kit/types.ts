import type {
  DocumentCameraError,
  DocumentCameraImage,
  DocumentCameraScan,
} from '../specs/OneDocumentCamera.nitro'

export type VNDocumentCameraScan = DocumentCameraScan
export type UIImage = DocumentCameraImage
export type VNDocumentCameraError = DocumentCameraError

export interface VNDocumentCameraViewControllerDelegate<Controller = unknown> {
  documentCameraViewController?(
    controller: Controller,
    result:
      | { didFinishWith: VNDocumentCameraScan }
      | { didFailWith: VNDocumentCameraError }
  ): void
  documentCameraViewControllerDidCancel?(controller: Controller): void
}

export interface VNDocumentCameraAvailability {
  readonly isSupported: boolean
}

export interface VNDocumentCameraViewControllerInstance {
  delegate: VNDocumentCameraViewControllerDelegate<VNDocumentCameraViewControllerInstance> | null
  present(animated?: boolean): Promise<void>
  dismiss(animated?: boolean): Promise<void>
}
