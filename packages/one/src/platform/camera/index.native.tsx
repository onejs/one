import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Platform } from 'react-native'
import NativeCamera, { Commands } from '../specs/OneNativeCameraNativeComponent'
import type {
  CameraCapturedPicture,
  CameraCodeType,
  CameraState,
  CameraViewProps,
  CameraViewRef,
} from './types'

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

type PendingPicture = {
  resolve: (picture: CameraCapturedPicture) => void
  reject: (error: Error) => void
  base64: boolean
}

let nextRequestId = 1

function codedError(code: string, message: string) {
  return Object.assign(new Error(message), { code })
}

// native failures arrive as "<code>: <message>", the same form nitro rejects with.
function nativeError(value: string) {
  const coded = /^((?:E|ERR)_[A-Z0-9_]+): ([\s\S]*)$/.exec(value)
  return coded ? codedError(coded[1], coded[2]) : new Error(value)
}

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

export const CameraView = forwardRef<CameraViewRef, CameraViewProps>(function CameraView(
  {
    active = true,
    facing = 'back',
    codeTypes = ['qr'],
    flash = 'off',
    enableTorch = false,
    zoom = 0,
    onStateChange,
    onCodeScanned,
    ...viewProps
  },
  ref
) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android')
    throw new Error('CameraView requires a native build')
  if (typeof active !== 'boolean') throw new TypeError('CameraView.active must be a boolean')
  if (facing !== 'back' && facing !== 'front') {
    throw new TypeError('CameraView.facing must be back or front')
  }
  if (!Array.isArray(codeTypes) || codeTypes.some((type) => !isCodeType(type))) {
    throw new TypeError('CameraView.codeTypes contains an unsupported code type')
  }
  if (flash !== 'off' && flash !== 'on' && flash !== 'auto') {
    throw new TypeError('CameraView.flash must be off, on or auto')
  }
  if (typeof enableTorch !== 'boolean') {
    throw new TypeError('CameraView.enableTorch must be a boolean')
  }
  if (typeof zoom !== 'number' || !(zoom >= 0 && zoom <= 1)) {
    throw new RangeError('CameraView.zoom must be a number from 0 to 1')
  }
  const nativeRef = useRef<React.ElementRef<typeof NativeCamera>>(null)
  const pending = useRef(new Map<number, PendingPicture>())

  useEffect(() => {
    const requests = pending.current
    return () => {
      for (const request of requests.values())
        request.reject(codedError('E_CAMERA_UNMOUNTED', 'CameraView unmounted before the picture was taken'))
      requests.clear()
    }
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      takePicture(options = {}) {
        const { quality = 1, base64 = false } = options
        if (typeof quality !== 'number' || !(quality >= 0 && quality <= 1))
          return Promise.reject(new RangeError('takePicture quality must be a number from 0 to 1'))
        if (typeof base64 !== 'boolean')
          return Promise.reject(new TypeError('takePicture base64 must be a boolean'))
        const view = nativeRef.current
        if (!view)
          return Promise.reject(codedError('E_CAMERA_UNMOUNTED', 'CameraView is not mounted'))
        const requestId = nextRequestId++
        return new Promise<CameraCapturedPicture>((resolve, reject) => {
          pending.current.set(requestId, { resolve, reject, base64 })
          Commands.takePicture(view, requestId, quality, base64)
        })
      },
    }),
    []
  )

  return (
    <NativeCamera
      {...viewProps}
      ref={nativeRef}
      active={active}
      facing={facing}
      codeTypes={[...new Set(codeTypes)]}
      flash={flash}
      enableTorch={enableTorch}
      zoom={zoom}
      onNativeCameraState={({ nativeEvent }) => onStateChange?.(cameraState(nativeEvent.state))}
      onNativeCameraCode={({ nativeEvent }) =>
        onCodeScanned?.({ type: codeType(nativeEvent.type), data: nativeEvent.data })
      }
      onNativeCameraPicture={({ nativeEvent }) => {
        const request = pending.current.get(nativeEvent.requestId)
        if (!request) return
        pending.current.delete(nativeEvent.requestId)
        if (nativeEvent.error) {
          request.reject(nativeError(nativeEvent.error))
          return
        }
        request.resolve({
          uri: nativeEvent.uri,
          width: nativeEvent.width,
          height: nativeEvent.height,
          format: 'jpg',
          ...(request.base64 ? { base64: nativeEvent.base64 } : {}),
        })
      }}
    />
  )
})
