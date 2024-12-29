import { Image } from '@tamagui/image-next'
import { X } from '@tamagui/lucide-icons'
import { Button, YStack } from 'tamagui'
import type { Attachment } from '~/zero'
import { dialogConfirm } from '../dialogs/actions'

export const AttachmentItem = ({
  editable,
  size = 200,
  onDelete,
  attachment,
}: { size?: number; editable?: boolean; attachment: Attachment; onDelete?: () => void }) => {
  const content = (() => {
    if (attachment.url) {
      return (
        <Image
          src={attachment.url}
          br="$6"
          ov="hidden"
          bw={1}
          bc="$color3"
          width={size}
          height={size}
          objectFit="contain"
        />
      )
    }
    return null
  })()

  return (
    <YStack pos="relative">
      {!!editable && (
        <Button
          circular
          icon={X}
          size="$1"
          pos="absolute"
          t={-2}
          r={-2}
          zi={10}
          onPress={async () => {
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
      {content}
    </YStack>
  )
}
