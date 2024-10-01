// Fork of @react-navigation/native Link.tsx with `href` and `replace` support added and
// `to` / `action` support removed.
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { Platform, Text, type GestureResponderEvent, type TextProps } from 'react-native'

import type { OneRouter } from '../interfaces/router'
import { resolveHref } from './href'
import { useLinkTo } from './useLinkTo'

/**
 * Component to render link to another route using a path.
 * Uses an anchor tag on the web.
 *
 * @param props.href Absolute path to route (e.g. `/feeds/hot`).
 * @param props.replace Should replace the current route without adding to the history.
 * @param props.push Should push the current route, always adding to the history.
 * @param props.asChild Forward props to child component. Useful for custom buttons.
 * @param props.children Child elements to render the content.
 * @param props.className On web, this sets the HTML `class` directly. On native, this can be used with CSS interop tools like Nativewind.
 */
export const Link = React.forwardRef(function Link(
  {
    href,
    replace,
    push,
    // TODO: This does not prevent default on the anchor tag.
    asChild,
    rel,
    target,
    download,
    ...rest
  }: OneRouter.LinkProps<any>,
  ref: React.ForwardedRef<Text>
) {
  // Mutate the style prop to add the className on web.
  const style = useInteropClassName(rest)

  // If not passing asChild, we need to forward the props to the anchor tag using React Native Web's `hrefAttrs`.
  const hrefAttrs = useHrefAttrs({ asChild, rel, target, download })

  const resolvedHref = React.useMemo(() => {
    if (href == null) {
      throw new Error('Link: href is required')
    }
    return resolveHref(href)
  }, [href])

  const props = useLinkTo({ href: resolvedHref, replace })

  const onPress = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent) => {
    if ('onPress' in rest) {
      rest.onPress?.(e)
    }
    props.onPress(e)
  }

  const Element = asChild ? Slot : Text

  // Avoid using createElement directly, favoring JSX, to allow tools like Nativewind to perform custom JSX handling on native.
  return (
    <Element
      ref={ref}
      {...props}
      {...hrefAttrs}
      {...rest}
      style={asChild ? null : style}
      {...Platform.select({
        web: {
          onClick: onPress,
        } as any,
        default: { onPress },
      })}
    />
  )
}) as unknown as OneRouter.LinkComponent

Link.resolveHref = resolveHref

// Mutate the style prop to add the className on web.
function useInteropClassName(props: { style?: TextProps['style']; className?: string }) {
  if (Platform.OS !== 'web') {
    return props.style
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return React.useMemo(() => {
    if (props.className == null) {
      return props.style
    }
    const cssStyle = {
      $$css: true,
      __routerLinkClassName: props.className,
    }

    if (Array.isArray(props.style)) {
      return [...props.style, cssStyle]
    }
    return [props.style, cssStyle]
  }, [props.style, props.className])
}

const useHrefAttrs = Platform.select<
  (
    props: Partial<OneRouter.LinkProps<any>>
  ) => { hrefAttrs?: any } & Partial<OneRouter.LinkProps<any>>
>({
  web: function useHrefAttrs({
    asChild,
    rel,
    target,
    download,
  }: Partial<OneRouter.LinkProps<any>>) {
    return React.useMemo(() => {
      const hrefAttrs = {
        rel,
        target,
        download,
      }
      if (asChild) {
        return hrefAttrs
      }
      return {
        hrefAttrs,
      }
    }, [asChild, rel, target, download])
  },
  default: function useHrefAttrs() {
    return {}
  },
})
