import type { ReactNode } from 'react'
export function PlatformSpecificRootProvider(props: { children: ReactNode }) {
  return <>{props.children}</>
}
