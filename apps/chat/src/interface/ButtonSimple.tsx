import { createElement, forwardRef, isValidElement } from 'react'
import {
  type GetProps,
  SizableText,
  type SizeTokens,
  styled,
  type TamaguiElement,
  TooltipSimple,
  XStack,
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
  px: '$2',
  br: '$4',
  bg: 'transparent',

  hoverStyle: {
    bg: '$color4',
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

type ButtonFrameProps = GetProps<typeof ButtonFrame> & {
  tooltip?: string
  icon?: any
  iconAfter?: boolean
  scaleIcon?: number
}

export const ButtonSimple = forwardRef<TamaguiElement, ButtonFrameProps & { size?: SizeTokens }>(
  ({ size, children, tooltip, icon, iconAfter, disabled, scaleIcon = 1, ...rest }, ref) => {
    const iconElement = icon
      ? isValidElement(icon)
        ? icon
        : createElement(icon, { size: 18 * scaleIcon, opacity: 0.5 })
      : null

    let contents = (
      <ButtonFrame
        ref={ref}
        disabled={disabled}
        {...(disabled && {
          opacity: 0.1,
          pointerEvents: 'none',
        })}
        {...rest}
      >
        {iconAfter ? null : iconElement}
        {typeof children !== 'string' ? (
          children
        ) : (
          <SizableText cursor="default" userSelect="none" fontSize={size} lineHeight={size}>
            {children}
          </SizableText>
        )}
        {iconAfter ? iconElement : null}
      </ButtonFrame>
    )

    if (tooltip) {
      contents = <TooltipSimple label={tooltip}>{contents}</TooltipSimple>
    }

    return contents
  }
)
