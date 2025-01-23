import { useLinkTo, type Href, type LinkProps as OneLinkProps } from 'one'
import { Text } from 'tamagui'

export type LinkProps = OneLinkProps<Href>

export const Link = ({ href, replace, asChild, disabled, ...props }: LinkProps) => {
  const linkProps = useLinkTo({ href: href as string, replace })

  return (
    <Text
      tag="a"
      disabled={!!disabled}
      // always except-style
      asChild={asChild ? 'except-style' : false}
      className="t_Link"
      cursor="pointer"
      color="inherit"
      // @ts-ignore
      fontSize="inherit"
      // @ts-ignore
      lineHeight="inherit"
      {...props}
      {...linkProps}
    />
  )
}
