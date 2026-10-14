import { forwardRef } from 'react'
import type { CameraViewProps, CameraViewRef } from './types'

export type {
  CameraCapturedPicture,
  CameraCode,
  CameraCodeType,
  CameraFacing,
  CameraFlashMode,
  CameraPictureOptions,
  CameraState,
  CameraViewProps,
  CameraViewRef,
} from './types'

export const CameraView = forwardRef<CameraViewRef, CameraViewProps>(function CameraView(): never {
  throw new Error('CameraView requires a native build')
})
