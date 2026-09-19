import type { ReactElement } from 'react'
import type { EdgeFadeProps } from './types'

// web entry. only the pure curve math and types live here; the component
// and the native-bound normalization stay in index.native.ts so no bundler
// ever resolves the Fabric spec or react-native runtime imports from the
// web graph. signatures stay identical to the native entry because the
// published declarations are built from this file and serve both platforms.
export { sampleCurve, serializeCurve } from './curves'
export type * from './types'

// renders nothing on web: rendering throws, but the declaration returns an
// element so native consumers typecheck against the component shape.
export function EdgeFade(_props: EdgeFadeProps): ReactElement {
  throw new Error('EdgeFade requires a native build with @vxrn/native installed')
}
