import type { ReactNode } from 'react'
import type { MapProps } from './generated/controlTypes'

// the map's own controls: compass, pitch, and user-location buttons composed
// under the map so they operate on the owning map. anything else throws.
export interface MapControlsSlot {
  children?: ReactNode
}

export type MapWithControlsProps = MapProps & MapControlsSlot
