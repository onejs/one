import { forwardRef } from 'react'
import {
  type GetProps,
  SizableText,
  type SizeTokens,
  styled,
  type TamaguiElement,
  XStack,
  type XStackProps,
} from 'tamagui'

const ButtonFrame = styled(XStack, {
  tag: 'button',
  focusable: true,
  role: 'button',
  tabIndex: -1,

  bw: 0,
  ai: 'center',
  gap: '$2',
  py: '$1.5',
  px: '$2.5',
  br: '$4',
  bg: 'transparent',

  hoverStyle: {
    bg: '$background05',
  },

  pressStyle: {
    bg: '$background025',
  },

  focusVisibleStyle: {
    outlineWidth: 2,
    outlineColor: 'red',
    outlineStyle: 'solid',
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

type ButtonFrameProps = GetProps<typeof ButtonFrame>

export const ButtonSimple = forwardRef<TamaguiElement, ButtonFrameProps & { size?: SizeTokens }>(
  ({ size, children, ...rest }, ref) => {
    return (
      <ButtonFrame ref={ref} {...rest}>
        {typeof children !== 'string' ? (
          children
        ) : (
          <SizableText cursor="default" userSelect="none" fontSize={size} lineHeight={size}>
            {children}
          </SizableText>
        )}
      </ButtonFrame>
    )
  }
)
