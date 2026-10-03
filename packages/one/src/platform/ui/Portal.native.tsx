import NativePortal from '../specs/OneNativePortalViewNativeComponent'
import NativePortalHost from '../specs/OneNativePortalHostViewNativeComponent'
import type { PortalProps, PortalHostProps } from './portalTypes'
export type { PortalProps, PortalHostProps } from './portalTypes'
export function Portal({ hostName = '', name = '', ...props }: PortalProps) {
  return <NativePortal {...props} hostName={hostName} name={name} />
}
export function PortalHost(props: PortalHostProps) {
  return <NativePortalHost {...props} />
}
