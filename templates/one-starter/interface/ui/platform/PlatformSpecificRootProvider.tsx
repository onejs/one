// the app root native needs; web needs none, so this passes children through.
// PlatformSpecificRootProvider.native.tsx mounts the gesture, keyboard and
// portal roots.
import type { ReactNode } from 'react'

export function PlatformSpecificRootProvider(props: { children: ReactNode }) {
  return <>{props.children}</>
}
