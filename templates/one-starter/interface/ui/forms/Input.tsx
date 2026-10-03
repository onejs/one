import { resolveSizing, type ComponentSize } from '@tamagui/core'
import { Input as TamaguiInput, styled } from 'tamagui'
import type { GetProps } from 'tamagui'

// the one focus treatment for every text field: a soft ring drawn with the
// css outline so it never shifts layout, plus a slightly stronger border. the
// browser's default blue ring is replaced rather than stacked on top.
export const inputFocusStyle = {
  borderColor: 'border-color focus:border-color-focus focus-visible:border-color-focus',
  outlineWidth: 'focus:2px focus-visible:2px',
  outlineStyle: 'focus:solid focus-visible:solid',
  outlineColor: 'focus:outline-color focus-visible:outline-color',
  outlineOffset: 'focus:1px focus-visible:1px',
} as const

export const fieldBaseStyle = {
  bg: 'background',
  borderWidth: 0.5,
  placeholderTextColor: 'placeholder-color',
  ...inputFocusStyle,
} as const

// sizes come from the shared sizing ladder, not a table here: font, padding,
// and radius are the rung's token keys and the floor is the rung's derived
// height, so this input stays aligned with every other sized control by
// construction, including rungs a custom config adds.
const getInputSize = styled.dynamic<ComponentSize | boolean>((val, env) => {
  const sizing = resolveSizing(val, env)
  if (!sizing) return
  return {
    rounded: sizing.radius,
    fontSize: sizing.fontSize,
    minH: sizing.height,
    px: sizing.paddingInline,
    py: sizing.paddingBlock,
  }
})

export type InputProps = GetProps<typeof Input>

export const Input = styled(TamaguiInput, {
  name: 'Input',
  ...fieldBaseStyle,
  variants: {
    size: getInputSize,
  } as const,
  defaultVariants: {
    size: 'md',
  },
})
