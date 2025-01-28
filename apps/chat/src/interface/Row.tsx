import { Button, SizableText, styled, withStaticProperties, XStack, type GetProps } from 'tamagui'

const RowComponent = styled(XStack, {
  gap: '$4',
  py: '$3',
  px: '$4',
  items: 'center',
  hoverStyle: {
    bg: '$color3',
  },

  variants: {
    active: {
      true: {
        bg: '$color3',
      },
    },
  } as const,
})

const RowText = styled(SizableText, {
  size: '$5',
  cursor: 'default',
})

const RowButton = styled(Button, {
  size: '$3',
  circular: true,
  scaleIcon: 1.2,
})

export const Row = withStaticProperties(RowComponent, {
  Text: RowText,
  Button: RowButton,
})

export type RowProps = GetProps<typeof Row>
