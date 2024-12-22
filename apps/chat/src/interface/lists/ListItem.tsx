import { createElement, forwardRef, isValidElement } from 'react'
import { Input, SizableText, type TamaguiElement, XStack, type XStackProps, YStack } from 'tamagui'

export type ListItemProps = XStackProps & {
  icon?: any
  iconAfter?: boolean
  editing?: boolean
  editingValue?: string
  onEditComplete?: (value: string) => void
  onEditCancel?: () => void
  active?: boolean
  disableHover?: boolean
  after?: any
  before?: any
}

export const ListItem = forwardRef<TamaguiElement, ListItemProps>(
  (
    {
      active,
      editing,
      editingValue,
      onEditComplete,
      onEditCancel,
      children,
      icon,
      iconAfter,
      disableHover,
      after,
      before,
      ...rest
    },
    ref
  ) => {
    const iconElement = icon
      ? isValidElement(icon)
        ? icon
        : createElement(icon, { size: 18, opacity: 0.5 })
      : null

    return (
      <XStack
        ref={ref}
        px="$2.5"
        py="$1.5"
        ai="center"
        userSelect="none"
        gap="$3"
        cur="default"
        {...(!disableHover && {
          hoverStyle: {
            bg: '$background025',
          },
        })}
        {...(active && {
          bg: '$background05',
          hoverStyle: {
            bg: '$background05',
          },
        })}
        {...rest}
      >
        {before}
        {iconAfter ? null : iconElement}
        {editing ? (
          <Input
            size="$3"
            fontSize={14}
            fontWeight="500"
            my={-4}
            mx={-8}
            bg="transparent"
            autoFocus
            defaultValue={editingValue}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Escape') {
                onEditCancel?.()
              }
            }}
            onSubmitEditing={(e) => {
              onEditComplete?.(e.nativeEvent.text)
            }}
          />
        ) : typeof children === 'string' ? (
          <SizableText fow="500" cur="default">
            {children}
          </SizableText>
        ) : (
          children
        )}
        {(iconAfter || after) && (
          <>
            <XStack f={1} />

            <XStack ai="center" als="flex-end" h="100%">
              {after}
              {iconAfter ? (
                <YStack pos="absolute" t={0} r={0} b={0} ai="center" jc="center" px="$3">
                  {iconElement}
                </YStack>
              ) : null}
            </XStack>
          </>
        )}
      </XStack>
    )
  }
)
