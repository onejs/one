import type { ViewProps } from 'react-native'
import type { DirectEventHandler } from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'

export type NativeMenuItem = Readonly<{
  id: string
  parentId: string
  type: string
  title: string
  subtitle: string
  systemImage: string
  state: string
  disabled: boolean
  destructive: boolean
  hidden: boolean
  keepsMenuPresented: boolean
  displayInline: boolean
  singleSelection: boolean
  displayAsPalette: boolean
  preferredElementSize: string
  discoverabilityTitle: string
}>

interface NativeProps extends ViewProps {
  items: ReadonlyArray<NativeMenuItem>
  menuTitle: string
  triggerLabel: string
  disabled: boolean
  onAction?: DirectEventHandler<Readonly<{ id: string }>>
}

export default codegenNativeComponent<NativeProps>('OneNativeMenu')
