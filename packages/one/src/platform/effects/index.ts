// web entry. EdgeFade draws with css here; the Fabric specs stay in
// index.native.ts so no web bundle resolves them. signatures stay identical
// to the native entry because the published declarations are built from this
// file and serve both platforms.
export { sampleCurve, serializeCurve } from './curves'
export { EdgeFade } from './EdgeFade'
export type * from './types'
export { Icon } from '../ui/Icon'
export { Image } from '../ui/Image'
export type { ImageProps } from '../ui/Image.native'
export type { IconColorRole, IconElements, IconProps } from '../ui/Icon'
export { Map } from '../ui/Map'
export { PictureInPicture } from '../ui/PictureInPicture'
export type { PictureInPictureProps } from '../ui/PictureInPicture.native'
export type {
  CameraPosition,
  Coordinates,
  MapCircle,
  MapMarker,
  MapPolygon,
  MapPolyline,
  MapProps,
} from '../ui/Map'

export { Blur } from './Blur'
export { Mask } from './Mask'

export { Portal, PortalHost } from '../ui/Portal'
export type { PortalProps, PortalHostProps } from '../ui/portalTypes'
export { Pager } from '../ui/Pager'
export type {
  PagerProps,
  PagerRef,
  PagerScrollEvent,
  PagerSelectedEvent,
  PagerScrollStateEvent,
} from '../ui/pagerTypes'
