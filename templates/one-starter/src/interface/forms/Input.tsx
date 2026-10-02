import {
  Input as TamaguiInput,
  styled,
  type GetProps,
  type TamaguiElement,
} from 'tamagui'
export const Input = styled(TamaguiInput, {
  height: 50,
  size: 'lg',
  borderWidth: {
    default: 0.5,
    'focus-visible': 0.5,
  },
  placeholderTextColor: 'color-8',
  outlineWidth: {
    'focus-visible': 3,
  },
  outlineStyle: {
    'focus-visible': 'solid',
  },
  outlineColor: {
    'focus-visible': 'outline-color',
  },
  outlineOffset: {
    'focus-visible': 1,
  },
  borderColor: {
    'focus-visible': 'color-5',
  },
})
export type InputProps = GetProps<typeof Input>
