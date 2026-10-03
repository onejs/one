// owned uniform pager spec; independent of the SwiftUI catalog.
import type { HostComponent, ViewProps } from 'react-native'
import type {
  DirectEventHandler,
  Int32,
  Double,
  WithDefault,
} from 'react-native/Libraries/Types/CodegenTypes'
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent'
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands'
import type * as React from 'react'

interface NativeProps extends ViewProps {
  initialPage?: WithDefault<Int32, 0>
  scrollEnabled?: WithDefault<boolean, true>
  orientation?: WithDefault<'horizontal' | 'vertical', 'horizontal'>
  layoutDirection?: WithDefault<'ltr' | 'rtl', 'ltr'>
  offscreenPageLimit?: WithDefault<Int32, -1>
  pageMargin?: WithDefault<Double, 0>
  overdrag?: WithDefault<boolean, false>
  overScrollMode?: WithDefault<'auto' | 'always' | 'never', 'auto'>
  keyboardDismissMode?: WithDefault<'none' | 'on-drag', 'none'>
  onPageScroll?: DirectEventHandler<Readonly<{ position: Int32; offset: Double }>>
  onPageSelected?: DirectEventHandler<Readonly<{ position: Int32 }>>
  onPageScrollStateChanged?: DirectEventHandler<Readonly<{ pageScrollState: string }>>
}
interface NativeCommands {
  setPage(viewRef: React.ElementRef<HostComponent<NativeProps>>, index: Int32): void
  setPageWithoutAnimation(
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    index: Int32
  ): void
  setScrollEnabledImperatively(
    viewRef: React.ElementRef<HostComponent<NativeProps>>,
    enabled: boolean
  ): void
}
export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: [
    'setPage',
    'setPageWithoutAnimation',
    'setScrollEnabledImperatively',
  ],
})
export default codegenNativeComponent<NativeProps>('OneNativePager')
