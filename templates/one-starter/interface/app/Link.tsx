/**
 * @agent-rule
 * Link renders a real anchor (`<a>` on web, RN Text on native) and takes only
 * navigation props. it is NOT a Tamagui component, so tamagui style props such
 * as `color`, `size`, `cursor`, `hoverStyle`, or `$platform-web` do not work on
 * it and land on the DOM node as invalid attributes. style the CHILD instead:
 * put a SizableText/Paragraph/View inside, or use `<Link asChild>` with a
 * tamagui child carrying `render="a"` when the link itself must be styled.
 */
import { Link as OneLink, type Href, type LinkProps as OneLinkProps } from 'one'
import { isWeb } from 'tamagui'
import type { CSSProperties } from 'react'

export type LinkProps = Omit<OneLinkProps<Href>, 'style'> & {
  style?: OneLinkProps<Href>['style'] | CSSProperties
}

const webLinkStyle = { color: 'inherit', textDecoration: 'none' } satisfies CSSProperties

export function Link({ style, ...props }: LinkProps) {
  // one renders web anchors correctly with css style objects, but its exported
  // style prop is still the narrower react native text style.
  const mergedStyle = isWeb
    ? ({
        ...webLinkStyle,
        ...(style as CSSProperties | undefined),
      } satisfies CSSProperties)
    : style
  return <OneLink {...props} style={mergedStyle as OneLinkProps<Href>['style']} />
}
