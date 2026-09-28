import { Platform } from 'react-native'
import NativeCamera from '../specs/OneNativeCameraNativeComponent'
import type { CameraCodeType, CameraState, CameraViewProps } from './types'

export type { CameraCode, CameraCodeType, CameraFacing, CameraState, CameraViewProps } from './types'

function cameraState(value: string): CameraState {
  switch (value) {
    case 'inactive':
    case 'permission-required':
    case 'unavailable':
    case 'ready':
    case 'unsupported':
    case 'failed':
      return value
    default:
      throw new Error(`CameraView received an unknown native state: ${value}`)
  }
}

function isCodeType(value: string): value is CameraCodeType {
  switch (value) {
    case 'qr':
    case 'ean13':
    case 'ean8':
    case 'upce':
    case 'code128':
    case 'code39':
    case 'code93':
    case 'pdf417':
    case 'aztec':
    case 'dataMatrix':
      return true
    default:
      return false
  }
}

function codeType(value: string): CameraCodeType {
  if (!isCodeType(value)) throw new Error(`CameraView received an unknown code type: ${value}`)
  return value
}

export function CameraView({
  active = true,
  facing = 'back',
  codeTypes = ['qr'],
  onStateChange,
  onCodeScanned,
  ...viewProps
}: CameraViewProps) {
  if (Platform.OS !== 'ios') throw new Error('CameraView requires an iOS native build')
  if (typeof active !== 'boolean') throw new TypeError('CameraView.active must be a boolean')
  if (facing !== 'back' && facing !== 'front') {
    throw new TypeError('CameraView.facing must be back or front')
  }
  if (!Array.isArray(codeTypes) || codeTypes.some((type) => !isCodeType(type))) {
    throw new TypeError('CameraView.codeTypes contains an unsupported code type')
  }
  return (
    <NativeCamera
      {...viewProps}
      active={active}
      facing={facing}
      codeTypes={[...new Set(codeTypes)]}
      onNativeCameraState={({ nativeEvent }) => onStateChange?.(cameraState(nativeEvent.state))}
      onNativeCameraCode={({ nativeEvent }) =>
        onCodeScanned?.({ type: codeType(nativeEvent.type), data: nativeEvent.data })
      }
    />
  )
}
