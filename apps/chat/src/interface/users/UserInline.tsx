import { SizableText, XStack } from 'tamagui'
import { Avatar } from '~/interface/Avatar'
import type { User } from '~/zero'

const avatarSizes = {
  small: 18,
  medium: 24,
} as const

const textSizes = {
  small: '$2',
  medium: '$3',
} as const

const gapSizes = {
  small: '$1.5',
  medium: '$2',
} as const

export const UserInline = ({
  user,
  size = 'medium',
}: { user: User; size?: 'small' | 'medium' }) => {
  return (
    <XStack items="center" gap={gapSizes[size]}>
      <Avatar size={avatarSizes[size]} image={user.image} />
      <SizableText size={textSizes[size]} fontWeight="500">
        {user.name || user.username}
      </SizableText>
    </XStack>
  )
}
