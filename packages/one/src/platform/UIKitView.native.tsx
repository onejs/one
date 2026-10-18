import { useMemo } from 'react'
import { callSDK, SDKHandle } from './sdk/wire'
import NativeUIKitHost from './specs/OneNativeUIKitHostNativeComponent'
import type { UIKitViewProps } from './types'

// every UIKit view and view controller shares this host: the SDK bindings build and
// configure the object, and OneNativeViews registers its handle for the host to mount.
export function UIKitView({ view, ...props }: UIKitViewProps) {
  if (!(view instanceof SDKHandle))
    throw new Error(
      'Swift.UIKitView view must be a UIView or UIViewController from one/ios/UIKit'
    )
  const viewId = useMemo(() => callSDK<number>('OneNativeViews', 0, null, [view]), [view])
  return <NativeUIKitHost {...props} viewId={viewId} />
}
