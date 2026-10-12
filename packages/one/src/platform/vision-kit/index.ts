import type {
  VNDocumentCameraViewControllerDelegate,
  VNDocumentCameraViewControllerInstance,
} from './types'
export type * from './types'

export class VNDocumentCameraViewController implements VNDocumentCameraViewControllerInstance {
  static get isSupported(): boolean {
    return false
  }
  delegate: VNDocumentCameraViewControllerDelegate<VNDocumentCameraViewController> | null =
    null
  present(_animated = true): Promise<void> {
    return Promise.reject(new Error('VNDocumentCameraViewController needs an iOS build'))
  }
  dismiss(_animated = true): Promise<void> {
    return Promise.reject(new Error('VNDocumentCameraViewController needs an iOS build'))
  }
}
