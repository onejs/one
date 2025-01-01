import { Image } from '@tamagui/lucide-icons'
import { useState, type DragEvent } from 'react'
import { Button, isWeb, Paragraph, Progress, XStack, YStack } from 'tamagui'
import { Avatar } from '../Avatar'
import { uploadImageEndpoint, useUploadImages } from './uploadImage'

export const AvatarUpload = ({
  defaultImage,
  onChangeImage,
}: {
  defaultImage?: string
  onChangeImage: (url: string) => void
}) => {
  const { uploads, handleUpload, handleFileChange } = useUploadImages({
    onChange: (uploads) => {
      if (uploads[0].url) {
        onChangeImage(uploads[0].url)
      }
    },
  })
  const [dropping, setDropping] = useState(false)

  const latestUpload = uploads[uploads.length - 1]
  const uploadUrl = latestUpload?.url
  const progress = latestUpload?.progress
  const errorMessage = latestUpload?.error

  return (
    <XStack
      gap="$4"
      ai="center"
      // @ts-expect-error
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setDropping(false)
        const file = event.dataTransfer.files[0]
        if (file) handleUpload([file])
      }}
      onDragOver={(e: any) => {
        setDropping(true)
        e.preventDefault()
        e.stopPropagation()
      }}
      onDragLeave={() => {
        setDropping(false)
      }}
      {...(dropping && {
        bg: '$color4',
      })}
    >
      <Avatar size={80} image={uploadUrl || defaultImage || ''} />

      {isWeb && (
        <form
          style={{ display: 'contents' }}
          action={uploadImageEndpoint}
          method="post"
          encType="multipart/form-data"
        >
          <YStack>
            <label htmlFor="file">
              <input
                style={{ display: 'none' }}
                type="file"
                id="file"
                name="file"
                onChange={handleFileChange}
              />
              <Button size="$3" tag="span" icon={Image}>
                Pick
              </Button>
            </label>

            {!!(progress && progress !== 100) && (
              <Progress mt="$2" value={progress} bg="$color2">
                <Progress.Indicator bc="$color7" animation="bouncy" />
              </Progress>
            )}

            {!!errorMessage && <Paragraph theme="red">{errorMessage}</Paragraph>}
          </YStack>
        </form>
      )}
    </XStack>
  )
}
