import { forwardRef } from 'react'
import {
  SizableText,
  type SizeTokens,
  styled,
  type TamaguiElement,
  XStack,
  type XStackProps,
} from 'tamagui'

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

export const Button = forwardRef<TamaguiElement, XStackProps & { size?: SizeTokens }>(
  ({ size, children, ...rest }, ref) => {
    return (
      <ButtonFrame ref={ref} {...rest}>
        <SizableText cursor="default" userSelect="none" fontSize={size} lineHeight={size}>
          {children}
        </SizableText>
      </ButtonFrame>
    )
  }
)
