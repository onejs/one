import { SizableText, styled, View, XStack } from 'tamagui'
import { Icons } from '~/interface/icons'
import type { ReactNode } from 'react'

const ListItemFrame = styled(XStack, {
  cursor: 'pointer',
  minH: 52,
  px: 18,
  py: 13,
  items: 'center',
  justify: 'space-between',
  gap: 13,
  bg: 'transparent hover:color-2 press:color-3',
  scale: 'press:0.99',
  variants: {
    active: {
      true: {
        bg: 'color-3',
      },
    },
  } as const,
})

export function ListItem({
  icon,
  title,
  trailing,
  active,
  onPress,
  ...props
}: {
  icon?: ReactNode
  title: ReactNode
  trailing?: ReactNode
  active?: boolean
  onPress?: () => void
  [key: string]: unknown
}) {
  return (
    <ListItemFrame active={active} onPress={onPress} {...props}>
      <XStack gap={13} items="center" flex={1}>
        {icon ? (
          <View width={24} items="center" justify="center">
            {icon}
          </View>
        ) : null}
        <SizableText size="4" fontWeight={active ? '700' : '500'}>
          {title}
        </SizableText>
      </XStack>
      {trailing ?? <Icons.Disclosure size={16} color="color-8" />}
    </ListItemFrame>
  )
}
