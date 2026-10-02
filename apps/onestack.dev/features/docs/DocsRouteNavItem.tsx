import { Link } from 'one'
import { createElement, useRef } from 'react'
import { SizableText, Spacer, XStack, YStack } from 'tamagui'
import { ExternalIcon } from '~/features/icons/ExternalIcon'
import type { NavItemProps } from './types'

export const DocsRouteNavItem = function DocsRouteNavItem({
  children,
  active,
  href,
  icon,
  pending,
  inMenu,
  index,
  external,
}: NavItemProps & {
  icon?: any
  inMenu?: boolean
  index: number
}) {
  const isExternal = external || href.startsWith('http')
  const ref = useRef<any>(undefined)

  return (
    <Link
      className="text-underline-none"
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      href={href as any}
    >
      <XStack
        ref={ref}
        className="docs-nav-item"
        alignItems="center"
        justifyContent="flex-end"
        px="4"
        py="1-5 sm:1-5"
        opacity={pending ? 0.25 : 1}
        backgroundColor="press:background04"
        pointerEvents={pending ? 'none' : ('inherit' as any)}
        {...(inMenu && {
          justifyContent: 'flex-start',
        })}
        pos="relative"
      >
        {!inMenu && (
          <YStack
            className="sidebar-indicator"
            opacity={active ? 1 : 0}
            pos="absolute"
            t={0}
            b={0}
            l={0}
            w={2}
            bg={`${active ? 'color10' : 'backgroundHover'}`}
            br="2"
          />
        )}
        <SizableText
          size="5"
          cursor="pointer"
          userSelect="none"
          opacity={`${active ? 1 : 0.65} hover:0.85`}
          w="100%"
          {...(active && {
            fontWeight: '700',
            opacity: 1,
          })}
          lh="5"
          col="color12"
        >
          {children}
          {!!icon && (
            <>
              &nbsp;
              {createElement(icon, {
                size: 12,
              })}
            </>
          )}
        </SizableText>
        {isExternal && (
          <XStack opacity={0.5}>
            <Spacer size="2" />
            <ExternalIcon />
          </XStack>
        )}
        {pending ? (
          <>
            <XStack flex={1} />
            <SizableText size="1" px="2" py="1" bg="background" borderRadius="3">
              WIP
            </SizableText>
          </>
        ) : null}
      </XStack>
    </Link>
  )
}
