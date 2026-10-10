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
        paddingHorizontal="4"
        paddingVertical="1-5 sm:1-5"
        opacity={pending ? 0.25 : 1}
        backgroundColor="press:background04"
        pointerEvents={pending ? 'none' : ('inherit' as any)}
        {...(inMenu && {
          justifyContent: 'flex-start',
        })}
        position="relative"
      >
        {!inMenu && (
          <YStack
            className="sidebar-indicator"
            opacity={active ? 1 : 0}
            position="absolute"
            top={0}
            bottom={0}
            left={0}
            width={2}
            backgroundColor={`${active ? 'color10' : 'backgroundHover'}`}
            borderRadius="2"
          />
        )}
        <SizableText
          size="5"
          cursor="pointer"
          userSelect="none"
          opacity={`${active ? 1 : 0.65} hover:0.85`}
          width="100%"
          {...(active && {
            fontWeight: '700',
            opacity: 1,
          })}
          lineHeight="5"
          color="color12"
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
            <SizableText
              size="1"
              paddingHorizontal="2"
              paddingVertical="1"
              backgroundColor="background"
              borderRadius="3"
            >
              WIP
            </SizableText>
          </>
        ) : null}
      </XStack>
    </Link>
  )
}
