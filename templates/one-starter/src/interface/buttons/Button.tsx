import { Button as TamaguiButton, styled, type GetProps } from 'tamagui'
export const Button = styled(TamaguiButton, {
  render: 'button',
  borderWidth: 0,
  cursor: 'pointer',
  variants: {
    appearance: {
      default: {
        bg: {
          default: 'color-3',
          hover: 'color-4',
          press: 'color-2',
        },
        opacity: {
          press: 0.8,
        },
      },
      outlined: {
        bg: 'transparent',
        borderWidth: 2,
        borderColor: {
          default: 'color-6',
          hover: 'color-8',
          press: 'color-4',
        },
        opacity: {
          press: 0.8,
        },
      },
      transparent: {
        bg: {
          default: 'transparent',
          hover: 'color-2',
          press: 'color-1',
        },
        opacity: {
          press: 0.8,
        },
      },
      floating: {
        bg: {
          default: 'color-4',
          hover: 'color-5',
          press: 'color-3',
        },
        shadowColor: 'shadow-2',
        shadowRadius: 5,
        shadowOffset: {
          height: 2,
          width: 0,
        },
        opacity: {
          press: 0.9,
        },
      },
    },
  } as const,
  defaultVariants: {
    appearance: 'default',
  },
  outlineWidth: {
    'focus-visible': 2,
  },
  outlineStyle: {
    'focus-visible': 'solid',
  },
  outlineColor: {
    'focus-visible': 'color-8',
  },
})
export type ButtonProps = GetProps<typeof Button>
