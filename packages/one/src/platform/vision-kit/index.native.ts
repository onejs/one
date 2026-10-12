import { NitroModules } from 'react-native-nitro-modules'
import type { OneDocumentCamera } from '../specs/OneDocumentCamera.nitro'
import { rethrowNativeError } from '../nativeError'
import type {
  VNDocumentCameraViewControllerDelegate,
  VNDocumentCameraViewControllerInstance,
} from './types'
export type * from './types'

function create(): OneDocumentCamera {
  if (!NitroModules.hasHybridObject('OneDocumentCamera')) {
    throw new Error('VNDocumentCameraViewController needs an iOS build')
  }
  return NitroModules.createHybridObject<OneDocumentCamera>('OneDocumentCamera')
}

let capabilities: OneDocumentCamera | undefined

export class VNDocumentCameraViewController implements VNDocumentCameraViewControllerInstance {
  static get isSupported(): boolean {
    return (capabilities ??= create()).isSupported
  }

  delegate: VNDocumentCameraViewControllerDelegate<VNDocumentCameraViewController> | null =
    null
  private readonly native = create()

  // presentation uses the current app presenter, adapting UIViewController ownership to js.
  present(animated = true): Promise<void> {
    return this.native
      .present(
        animated,
        (scan) =>
          this.delegate?.documentCameraViewController?.(this, { didFinishWith: scan }),
        () => this.delegate?.documentCameraViewControllerDidCancel?.(this),
        (error) =>
          this.delegate?.documentCameraViewController?.(this, { didFailWith: error })
      )
      .catch(rethrowNativeError)
  }

  dismiss(animated = true): Promise<void> {
    return this.native.dismiss(animated).catch(rethrowNativeError)
  }
}
