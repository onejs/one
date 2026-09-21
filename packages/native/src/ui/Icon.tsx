import type { ReactElement } from 'react'
import type { IconProps } from './iconTypes'

export function Icon({ icons }: IconProps): ReactElement | null {
  return icons.web ?? null
}

export type { IconColorRole, IconElements, IconProps } from './iconTypes'
