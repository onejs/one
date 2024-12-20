import { createElement, forwardRef } from 'react'
import { Input, SizableText, type TamaguiElement, XStack, type XStackProps } from 'tamagui'

export const ListItem = forwardRef<
  TamaguiElement,
  XStackProps & {
    icon?: any
    iconAfter?: boolean
    editing?: boolean
    editingValue?: string
    onEditComplete?: (value: string) => void
    onEditCancel?: () => void
    active?: boolean
  }
>(
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
      ...rest
    },
    ref
  ) => {
    const iconElement = icon ? createElement(icon, { size: 18, opacity: 0.5 }) : null

    return (
      <XStack
        ref={ref}
        px="$2.5"
        py="$1.5"
        ai="center"
        userSelect="none"
        gap="$3"
        cur="default"
        hoverStyle={{
          bg: '$background025',
        }}
        {...(active && {
          bg: '$background05',
          hoverStyle: {
            bg: '$background05',
          },
        })}
        {...rest}
      >
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
        {iconAfter ? iconElement : null}
      </XStack>
    )
  }
)
