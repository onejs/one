import { Button, SizableText, styled, withStaticProperties, XStack } from 'tamagui'

const RowComponent = styled(XStack, {
  gap: '$4',
  py: '$3',
  px: '$4',
  ai: 'center',
  hoverStyle: {
    bg: '$color3',
  },
})

const RowText = styled(SizableText, {
  size: '$5',
  cur: 'default',
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
