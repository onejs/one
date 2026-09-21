import type { ReactElement } from 'react'
import type { AdaptivePanelProps } from './types'

// web entry: One UI is native-focused, so the panel renders nothing on web.
// the signature stays identical to the native entry because the published
// declarations are built from the web graph and serve both platforms.
export function AdaptivePanel(_props: AdaptivePanelProps): ReactElement {
  throw new Error('AdaptivePanel requires a native build with @vxrn/native installed')
}
