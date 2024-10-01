import type { Href, LinkProps } from 'one'
import { Link as OneLink } from 'one'

export const Link = ({
  passthrough,
  ...props
}: LinkProps<Href> & {
  passthrough?: boolean
}) => {
  if (passthrough) {
    return props.children
  }

  return <OneLink {...props} />
}
