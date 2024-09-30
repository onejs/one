import type { Href, LinkProps } from 'vxs'
import { Link as OneLink } from 'vxs'

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
