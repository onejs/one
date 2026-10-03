import { styled, View, type GetProps } from 'tamagui'

const PressableFrame = styled(View, {
  hitSlop: 10,
  cursor: 'pointer',
  opacity: 'press:0.5',
})

export type PressableProps = GetProps<typeof PressableFrame>

export function Pressable(props: PressableProps) {
  return <PressableFrame {...props} />
}
