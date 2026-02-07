// Fork of @react-navigation/native Link.tsx with `href` and `replace` support added and
// `to` / `action` support removed.
import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'
import { type GestureResponderEvent, Platform, Text, type TextProps } from 'react-native'

import type { OneRouter } from '../interfaces/router'
import { LinkMenu, LinkMenuAction, LinkPreview, LinkTrigger } from './elements'
import { resolveHref } from './href'
import { useLinkTo } from './useLinkTo'
import { InternalLinkPreviewContext } from './preview/InternalLinkPreviewContext'
import { NativeLinkPreview } from './preview/nativeLinkPreview'

export type { LinkMenuActionProps, LinkMenuProps, LinkPreviewProps, LinkTriggerProps } from './elements'

/**
 * Extracts compound children (Link.Trigger, Link.Preview, Link.Menu) from children.
 * Returns the trigger content and other compound children separately.
 */
function useCompoundChildren(children: React.ReactNode) {
  return React.useMemo(() => {
    let triggerChild: React.ReactNode = null
    let previewChild: React.ReactNode = null
    let menuChild: React.ReactNode = null
    let hasCompoundChildren = false

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return

      if (child.type === LinkTrigger) {
        hasCompoundChildren = true
        triggerChild = child
      } else if (child.type === LinkPreview) {
        hasCompoundChildren = true
        previewChild = child
      } else if (child.type === LinkMenu) {
        hasCompoundChildren = true
        menuChild = child
      }
    })

    return {
      hasCompoundChildren,
      triggerChild,
      previewChild,
      menuChild,
    }
  }, [children])
}

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
    id,
    mask,
    // TODO: This does not prevent default on the anchor tag.
    asChild,
    rel,
    target,
    download,
    ...rest
  }: OneRouter.LinkProps<any>,
  ref: React.ForwardedRef<Text>
) {
  const [isPreviewVisible, setIsPreviewVisible] = React.useState(false)

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

  const resolvedMask = React.useMemo(() => {
    return mask ? resolveHref(mask) : undefined
  }, [mask])

  const props = useLinkTo({ href: resolvedHref, replace, mask: resolvedMask })

  const onPress = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent
  ) => {
    if ('onPress' in rest) {
      rest.onPress?.(e)
    }
    props.onPress(e)
  }

  // Extract compound children (Link.Trigger, Link.Preview, Link.Menu)
  const { hasCompoundChildren, triggerChild, previewChild, menuChild } =
    useCompoundChildren(rest.children)

  // Context value for compound children
  const internalContextValue = React.useMemo(
    () => ({
      isVisible: isPreviewVisible,
      href: resolvedHref,
    }),
    [isPreviewVisible, resolvedHref]
  )

  // If using compound children pattern with asChild
  if (hasCompoundChildren && asChild && triggerChild && React.isValidElement(triggerChild)) {
    const triggerContent = (triggerChild as React.ReactElement<{ children?: React.ReactNode }>).props?.children

    // On iOS, wrap with native preview
    if (Platform.OS === 'ios') {
      return (
        <InternalLinkPreviewContext.Provider value={internalContextValue}>
          <NativeLinkPreview
            nextScreenId={undefined}
            tabPath={undefined}
            onWillPreviewOpen={() => setIsPreviewVisible(true)}
            onPreviewDidClose={() => setIsPreviewVisible(false)}
            onPreviewTapped={() => {
              onPress({} as any)
            }}
          >
            <Slot
              ref={ref}
              {...props}
              {...hrefAttrs}
              {...(rest as any)}
              {...(process.env.TAMAGUI_TARGET === 'web' ? { id } : { nativeID: id })}
              onPress={onPress}
            >
              {triggerContent}
            </Slot>
            {previewChild}
            {menuChild}
          </NativeLinkPreview>
        </InternalLinkPreviewContext.Provider>
      )
    }

    // On other platforms, just render the trigger
    return (
      <Slot
        ref={ref}
        {...props}
        {...hrefAttrs}
        {...(rest as any)}
        {...(process.env.TAMAGUI_TARGET === 'web' ? { id } : { nativeID: id })}
        {...Platform.select({
          web: {
            onClick: onPress,
          } as any,
          default: { onPress },
        })}
      >
        {triggerContent}
      </Slot>
    )
  }

  const Element = asChild ? Slot : Text

  // Avoid using createElement directly, favoring JSX, to allow tools like Nativewind to perform custom JSX handling on native.
  return (
    <Element
      ref={ref}
      {...props}
      {...hrefAttrs}
      {...rest}
      {...(process.env.TAMAGUI_TARGET === 'web' ? { id } : { nativeID: id })}
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

// Assign static properties and sub-components
Link.resolveHref = resolveHref
Link.Menu = LinkMenu
Link.MenuAction = LinkMenuAction
Link.Preview = LinkPreview
Link.Trigger = LinkTrigger

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
