import { memo } from 'react'
import { Circle, styled, YStack, type CircleProps } from 'tamagui'
import { Image } from '~/interface/image/Image'
import { UserIcon } from '../icons/phosphor/UserIcon'
export type SimpleSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
const simpleSizes: Record<SimpleSize, number> = {
  xs: 24,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
}
function getSimpleSize(size: number | SimpleSize): number {
  if (typeof size === 'number') return size
  return simpleSizes[size] ?? 28
}
export type AvatarProps = Omit<CircleProps, 'size'> & {
  image: string | null | undefined
  name?: string
  size?: number | SimpleSize
  active?: boolean
  isOnline?: boolean | null
  disableBorder?: boolean
  gradient?: boolean
  gradientColors?: string[]
}
export const Avatar = memo(
  ({
    image,
    name,
    size: sizeIn = 28,
    active,
    isOnline,
    disableBorder,
    gradient,
    gradientColors,
    ...rest
  }: AvatarProps) => {
    const size = getSimpleSize(sizeIn)
    const isBig = size > 40
    const scale = isBig ? size / 42 : size / 21
    return (
      <YStack
        pointerEvents="none"
        w={size}
        h={size}
        position="relative"
        rounded={100}
        {...(!disableBorder && {
          outlineColor: 'color-3',
          outlineOffset: 1,
          outlineWidth: 0.5,
          outlineStyle: 'solid',
        })}
      >
        <SelectableCircle
          active={active || false}
          pressable={!!rest.onPress && !active}
          size={size}
          overflow="hidden"
          className={
            typeof isOnline === 'undefined'
              ? ''
              : isBig
                ? 'avatar-cutout-big'
                : 'avatar-cutout-small'
          }
          {...rest}
        >
          {image ? (
            <Image
              src={image}
              alt={name ? `${name}'s avatar` : 'User avatar'}
              w={size}
              h={size}
              objectFit="cover"
            />
          ) : (
            <UserIcon size={size / 2} />
          )}
        </SelectableCircle>

        {typeof isOnline === 'boolean' ? (
          <Circle
            position="absolute"
            b={-1.1 * scale + (isBig ? 4.5 : 0)}
            r={-1.1 * scale + (isBig ? 4.5 : 0)}
            size={7 * scale}
            opacity={1}
            bg={isOnline ? 'green-600' : 'color-4'}
          />
        ) : null}
      </YStack>
    )
  }
)
const SelectableCircle = styled(Circle, {
  select: 'none',
  bg: 'background',
  variants: {
    active: {
      true: {
        outlineColor: {
          default: '#fff',
          press: '#ccc',
        },
        outlineWidth: 2,
        outlineStyle: 'solid',
      },
    },
    pressable: {
      true: {
        outlineColor: {
          hover: 'color-5',
          press: '#fff',
        },
        outlineWidth: {
          hover: 2,
          press: 2,
        },
        outlineStyle: {
          hover: 'solid',
          press: 'solid',
        },
      },
    },
  } as const,
})
