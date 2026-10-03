import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'
export type PortalProps = ViewProps & {
  hostName?: string
  name?: string
  children: ReactNode
}
export type PortalHostProps = ViewProps & { name: string; children?: ReactNode }
