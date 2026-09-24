import type { ReactElement } from 'react'
import type { BlurProps, EdgeFadeProps, MaskProps } from './types'

// web entry. only the pure curve math and types live here; the components
// and the native-bound normalization stay in index.native.ts so no bundler
// ever resolves the Fabric spec or react-native runtime imports from the
// web graph. signatures stay identical to the native entry because the
// published declarations are built from this file and serve both platforms.
export { sampleCurve, serializeCurve } from './curves'
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

// renders nothing on web: rendering throws, but the declarations return an
// element so native consumers typecheck against the component shape.
export function EdgeFade(_props: EdgeFadeProps): ReactElement {
  throw new Error('EdgeFade requires a native build with @vxrn/native installed')
}

export function Blur(_props: BlurProps): ReactElement {
  throw new Error('Blur requires a native build with @vxrn/native installed')
}

export function Mask(_props: MaskProps): ReactElement {
  throw new Error('Mask requires a native build with @vxrn/native installed')
}
