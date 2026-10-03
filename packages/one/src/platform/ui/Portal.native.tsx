import NativePortal from '../specs/OneNativePortalViewNativeComponent'
import NativePortalHost from '../specs/OneNativePortalHostViewNativeComponent'
import type { PortalProps, PortalHostProps } from './portalTypes'
export type { PortalProps, PortalHostProps } from './portalTypes'
export function Portal({ hostName = '', name = '', ...props }: PortalProps) {
  return <NativePortal {...props} hostName={hostName} name={name} />
}
// the native host is never a touch target itself (OneNativePortalHostView
// hitTest, OnePortalHost's BOX_NONE), so a full-screen host blocks nothing.
export function PortalHost(props: PortalHostProps) {
  return <NativePortalHost {...props} />
}
