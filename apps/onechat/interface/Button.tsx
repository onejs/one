import { SizableText, type SizeTokens, styled, XStack, type XStackProps } from 'tamagui'

const ButtonFrame = styled(XStack, {
  ai: 'center',
  gap: '$2',
  py: '$1.5',
  px: '$2.5',
  br: '$4',
  hoverStyle: {
    bg: '$background05',
  },
  pressStyle: {
    bg: '$background025',
  },

  variants: {
    active: {
      true: {
        bg: '$color3',
      },
    },

    size: {
      large: {
        py: '$3',
        px: '$4',
      },
    },

    circular: {
      true: {
        borderRadius: 100,
        overflow: 'hidden',
      },
    },
  } as const,
})

export const Button = ({ size, children, ...rest }: XStackProps & { size?: SizeTokens }) => {
  return (
    <ButtonFrame {...rest}>
      <SizableText fontSize={size} lineHeight={size}>
        {children}
      </SizableText>
    </ButtonFrame>
  )
}
