import { Slot } from '@radix-ui/react-slot'
import { createLink } from '@tanstack/react-router'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'

const Anchor = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<'a'> & { asChild?: boolean }>(
  function Anchor({ asChild, ...props }, ref) {
    const Element = asChild ? Slot : 'a'
    return <Element {...props} ref={ref} />
  }
)

export const RouteLink = createLink(Anchor)
