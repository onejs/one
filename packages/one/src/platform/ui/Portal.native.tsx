import NativePortal from '../specs/OneNativePortalViewNativeComponent'
import NativePortalHost from '../specs/OneNativePortalHostViewNativeComponent'
import type { PortalProps, PortalHostProps } from './portalTypes'
export type { PortalProps, PortalHostProps } from './portalTypes'
export function Portal({ hostName = '', name = '', ...props }: PortalProps) {
  return <NativePortal {...props} hostName={hostName} name={name} />
}
// a host is never a touch target itself: a full-screen host would otherwise
// swallow every touch meant for the views beneath it.
export function PortalHost(props: PortalHostProps) {
  return <NativePortalHost pointerEvents="box-none" {...props} />
}
