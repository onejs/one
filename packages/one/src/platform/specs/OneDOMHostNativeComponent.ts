import type * as React from 'react'
import type { HostComponent, ViewProps } from 'react-native'
import type {
  DirectEventHandler,
  Double,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands'

interface NativeProps extends ViewProps {
  entryId: string
  developmentURL?: string
  bootstrapState: string
  scrollEnabled?: WithDefault<boolean, true>
  onDocumentStart?: DirectEventHandler<Readonly<{ epoch: string; revision: Double }>>
  onMessage?: DirectEventHandler<Readonly<{ message: string }>>
  onLoad?: DirectEventHandler<Readonly<{ epoch: string }>>
  onError?: DirectEventHandler<Readonly<{ epoch: string; message: string; code: string }>>
  onProcessTerminated?: DirectEventHandler<Readonly<{ epoch: string }>>
}

interface NativeCommands {
  post(viewRef: React.ElementRef<HostComponent<NativeProps>>, message: string): void
}

export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['post'],
})
export default codegenNativeComponent<NativeProps>('OneDOMHost')
