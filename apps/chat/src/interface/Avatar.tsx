import { Circle, Image, styled, type CircleProps } from 'tamagui'

const SelectableCircle = styled(Circle, {
  variants: {
    active: {
      true: {
        outlineColor: '#fff',
        outlineWidth: 2,
        outlineStyle: 'solid',
      },
    },

    pressable: {
      true: {
        hoverStyle: {
          outlineColor: '$color10',
          outlineWidth: 2,
          outlineStyle: 'solid',
        },

        pressStyle: {
          outlineColor: '$color8',
          outlineWidth: 2,
          outlineStyle: 'solid',
        },
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
    <SelectableCircle
      active={active}
      pressable={!!rest.onPress && !active}
      size={size}
      bg="$color5"
      ov="hidden"
      {...rest}
    >
      {image && <Image src={image} width={size} height={size} />}
    </SelectableCircle>
  )
}
