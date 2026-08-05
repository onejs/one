import { Slot } from '@radix-ui/react-slot'
import * as React from 'react'

import type { OneRouter } from '../interfaces/router'
import { resolveHref } from './href'
import { useLinkTo } from './useLinkTo'

export const Link = React.forwardRef(function Link(
  {
    href,
    replace,
    push: _push,
    id,
    mask,
    asChild,
    rel,
    target,
    download,
    className,
    style,
    onPress,
    disabled,
    accessibilityLabel,
    // rn-flavored prop shared code passes; rnw translated it, the dom link must too
    testID,
    ...rest
  }: OneRouter.LinkProps<any> & { testID?: string },
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const resolvedHref = React.useMemo(() => {
    if (href == null) {
      throw new Error('Link: href is required')
    }
    return resolveHref(href)
  }, [href])

  const resolvedMask = React.useMemo(() => (mask ? resolveHref(mask) : undefined), [mask])
  const link = useLinkTo({ href: resolvedHref, replace, mask: resolvedMask })
  const flattenedStyle = React.useMemo<React.CSSProperties>(() => {
    const styleValue: unknown = style
    const styleValues: unknown[] = Array.isArray(styleValue)
      ? styleValue.flat(Number.POSITIVE_INFINITY)
      : [styleValue]
    return styleValues.reduce<React.CSSProperties>(
      (result, value) =>
        value && typeof value === 'object'
          ? Object.assign(result, value as React.CSSProperties)
          : result,
      {}
    )
  }, [style])

  const Element = asChild ? Slot : 'a'

  return (
    <Element
      ref={ref}
      {...rest}
      href={link.href}
      role={link.role}
      className={className}
      style={flattenedStyle}
      // undefined has to be omitted, not passed: with asChild it overwrites the child's own
      // value, so a bare `data-testid: undefined` wipes the testID a tamagui child sets
      {...(id == null ? null : { id })}
      {...(rel == null ? null : { rel })}
      {...(target == null ? null : { target })}
      {...(download == null ? null : { download })}
      {...(testID == null ? null : { 'data-testid': testID })}
      {...(accessibilityLabel == null ? null : { 'aria-label': accessibilityLabel })}
      {...(disabled ? { 'aria-disabled': true } : null)}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault()
          return
        }
        onPress?.(event)
        link.onPress(event)
      }}
    />
  )
}) as unknown as OneRouter.LinkComponent

Link.resolveHref = resolveHref
