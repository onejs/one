import type { CameraViewProps } from './types'

export type { CameraCode, CameraCodeType, CameraFacing, CameraState, CameraViewProps } from './types'

export function CameraView(_props: CameraViewProps): never {
  throw new Error('CameraView requires an iOS native build')
}
