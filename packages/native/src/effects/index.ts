import type { ReactElement } from 'react'
import type { AdaptivePanelProps } from '../adaptive-panel/types'
import type { BlurProps, EdgeFadeProps, MaskProps } from './types'

// web entry. only the pure curve math and types live here; the components
// and the native-bound normalization stay in index.native.ts so no bundler
// ever resolves the Fabric spec or react-native runtime imports from the
// web graph. signatures stay identical to the native entry because the
// published declarations are built from this file and serve both platforms.
export { sampleCurve, serializeCurve } from './curves'
export type * from './types'
export type * from '../adaptive-panel/types'
export { Icon } from '../ui/Icon'
export type { IconColorRole, IconElements, IconProps } from '../ui/Icon'

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

export function AdaptivePanel(_props: AdaptivePanelProps): ReactElement {
  throw new Error('AdaptivePanel requires a native build with @vxrn/native installed')
}
