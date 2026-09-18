import { Slot as RUISlot } from '@radix-ui/react-slot'
import type { ForwardRefExoticComponent, HTMLAttributes, RefAttributes } from 'react'

export interface Slot<
  Props = HTMLAttributes<HTMLElement>,
  Ref = HTMLElement,
> extends ForwardRefExoticComponent<Props & RefAttributes<Ref>> {}

export const Slot = RUISlot as Slot
