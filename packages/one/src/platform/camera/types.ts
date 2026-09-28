import type { ViewProps } from 'react-native'

export type CameraFacing = 'back' | 'front'

export type CameraCodeType =
  | 'qr'
  | 'ean13'
  | 'ean8'
  | 'upce'
  | 'code128'
  | 'code39'
  | 'code93'
  | 'pdf417'
  | 'aztec'
  | 'dataMatrix'

export type CameraState =
  | 'inactive'
  | 'permission-required'
  | 'unavailable'
  | 'ready'
  | 'unsupported'
  | 'failed'

export interface CameraCode {
  type: CameraCodeType
  data: string
}

export interface CameraViewProps extends ViewProps {
  active?: boolean
  facing?: CameraFacing
  codeTypes?: readonly CameraCodeType[]
  onStateChange?: (state: CameraState) => void
  onCodeScanned?: (code: CameraCode) => void
}
