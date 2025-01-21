import { Circle, styled, type CircleProps, Image } from 'tamagui'

const SelectableCircle = styled(Circle, {
  variants: {
    active: {
      true: {
        outlineColor: '#fff',
        outlineWidth: 2,
        outlineStyle: 'solid',
      },
    },
  } as const,
})

export const Avatar = ({
  image,
  size = 32,
  active,
  ...rest
}: CircleProps & { image: string; size?: number; active?: boolean }) => {
  return (
    <SelectableCircle active={active} size={size} bg="$color5" overflow="hidden" {...rest}>
      {image && <Image src={image} width={size} height={size} />}
    </SelectableCircle>
  )
}
