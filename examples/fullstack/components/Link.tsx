import type { ViewProps } from 'react-native'
import { Text } from 'tamagui'
import { useLinkTo, type LinkProps as VXSLinkProps } from 'vxs'

export type LinkProps = ViewProps & VXSLinkProps

export const Link = ({ href, replace, asChild, ...props }: LinkProps) => {
  const linkProps = useLinkTo({ href: href as string, replace })

  return (
    <Text
      tag="a"
      // always except-style
      asChild={asChild ? 'except-style' : false}
      className="t_Link"
      cursor="pointer"
      color="inherit"
      // @ts-expect-error
      fontSize="inherit"
      // @ts-expect-error
      lineHeight="inherit"
      {...props}
      {...linkProps}
    />
  )
}
