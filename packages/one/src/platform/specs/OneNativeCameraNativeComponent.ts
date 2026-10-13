import type { HostComponent, ViewProps } from 'react-native'
import type {
  DirectEventHandler,
  Double,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
import type * as React from 'react'

interface NativeProps extends ViewProps {
  active: boolean
  facing: string
  codeTypes: ReadonlyArray<string>
  flash: string
  enableTorch: boolean
  zoom: Double
  onNativeCameraState?: DirectEventHandler<Readonly<{ state: string }>>
  onNativeCameraCode?: DirectEventHandler<Readonly<{ type: string; data: string }>>
  // error is empty on success, otherwise "<code>: <message>".
  onNativeCameraPicture?: DirectEventHandler<
    Readonly<{
      requestId: Int32
      uri: string
      width: Int32
      height: Int32
      base64: string
      error: string
    }>
  >
}

interface NativeCommands {
  takePicture(
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    requestId: Int32,
    quality: Double,
    base64: boolean
  ): void
}

export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['takePicture'],
})

export default codegenNativeComponent<NativeProps>('OneNativeCamera')
