import { Image } from '@tamagui/image-next'
import { X } from '@tamagui/lucide-icons'
import { Button, YStack, type YStackProps } from 'tamagui'
import type { Attachment } from '~/zero/types'
import { dialogConfirm } from '../dialogs/actions'

export const AttachmentItem = ({
  editable,
  size = 200,
  onDelete,
  attachment,
  rounded,
  onPress,
}: {
  rounded?: boolean
  size?: number
  editable?: boolean
  attachment: Attachment
  onDelete?: () => void
  onPress?: YStackProps['onPress']
}) => {
  const content = (() => {
    if (attachment.url) {
      return <Image src={attachment.url} width={size} height={size} objectFit="contain" />
    }
    return null
  })()

  return (
    <YStack
      onPress={onPress}
      pos="relative"
      p={size * 0.025}
      m={size * -0.025}
      br={size * 0.1}
      {...(onPress && {
        hoverStyle: {
          bg: 'rgba(0,0,0,0.05)',
        },
        pressStyle: {
          bg: 'rgba(0,0,0,0.075)',
        },
      })}
    >
      {!!editable && (
        <Button
          circular
          icon={X}
          size="$1"
          pos="absolute"
          t={-2}
          r={-2}
          zi={10}
          onPress={async (e) => {
            e.stopPropagation()

            if (
              await dialogConfirm({
                title: `Delete attachment?`,
              })
            ) {
              onDelete?.()
            }
          }}
        />
      )}

      <YStack
        {...(rounded && {
          br: rounded ? size * 0.33 : 0,
          ov: 'hidden',
          bw: Math.round(size * 0.015),
          bc: '$color3',
        })}
      >
        {content}
      </YStack>
    </YStack>
  )
}
