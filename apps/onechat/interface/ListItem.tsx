import { forwardRef } from 'react'
import { Input, SizableText, type TamaguiElement, XStack, type XStackProps } from 'tamagui'

export const ListItem = forwardRef<
  TamaguiElement,
  XStackProps & {
    editing?: boolean
    onEditComplete?: (value: string) => void
    onEditCancel?: () => void
    active?: boolean
  }
>(({ active, editing, onEditComplete, onEditCancel, children, ...rest }, ref) => {
  return (
    <XStack
      ref={ref}
      px="$2.5"
      py="$1.5"
      userSelect="none"
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
      {editing ? (
        <Input
          size="$3"
          fontSize={14}
          fontWeight="500"
          my={-4}
          mx={-8}
          bg="transparent"
          autoFocus
          defaultValue={children}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Escape') {
              onEditCancel?.()
            }
          }}
          onSubmitEditing={(e) => {
            onEditComplete?.(e.nativeEvent.text)
          }}
        />
      ) : (
        <SizableText fow="500" cur="default">
          {children}
        </SizableText>
      )}
    </XStack>
  )
})
