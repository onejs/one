import { useLinkTo, type Href, type LinkProps as OneLinkProps } from 'one'
import { Text } from 'tamagui'

export type LinkProps = OneLinkProps<Href>

export const Link = ({ href, replace, asChild, ...props }: LinkProps) => {
  const linkProps = useLinkTo({ href: href as string, replace })

  return (
    <Text
      render="a"
      fontFamily="inherit"
      cursor="pointer"
      color="inherit hover:color12"
      fontSize="inherit"
      lineHeight="inherit"
      textDecorationColor="color04 hover:color12"
      {...props}
      {...(linkProps as any)}
      asChild={asChild ? 'except-style' : false}
      className="t_Link"
    />
  )
}
