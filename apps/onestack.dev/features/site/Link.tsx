import { Slot } from '@radix-ui/react-slot'
import { useLinkProps } from '@tanstack/react-router'
import type { ComponentProps } from 'react'
import { Text } from 'tamagui'

export type LinkProps = Omit<ComponentProps<typeof Text>, 'href'> & { href: string; replace?: boolean; asChild?: boolean }

export const Link = ({ href, replace, asChild, ...props }: LinkProps) => {
  const linkProps = useLinkProps({ to: href, replace, target: props.target })
  const { className: routerClass, ...anchorProps } = linkProps
  if (asChild) return <Slot {...anchorProps}>{props.children}</Slot>

  return (
    <Text
      asChild="web"
      fontFamily="inherit"
      cursor="pointer"
      color="inherit hover:color12"
      fontSize="inherit"
      lineHeight="inherit"
      textDecorationColor="color04 hover:color12"
      {...props}
      className="t_Link"
    >
      <a {...linkProps}>{props.children}</a>
    </Text>
  )
}
