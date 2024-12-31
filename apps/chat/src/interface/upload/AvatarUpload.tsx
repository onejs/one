import { type DragEvent, useState } from 'react'
import { isWeb, Paragraph, Progress, YStack } from 'tamagui'
import { Avatar } from '../Avatar'
import { uploadImageEndpoint, useUploadImages, type FileUpload } from './uploadImage'

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
    <YStack
      gap="$4"
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
      <Avatar size={100} image={uploadUrl || defaultImage || ''} />

      {isWeb && (
        <form action={uploadImageEndpoint} method="post" encType="multipart/form-data">
          <YStack>
            <input type="file" id="file" name="file" onChange={handleFileChange} />

            {!!(progress && progress !== 100) && (
              <Progress mt="$2" value={progress} bg="$color2">
                <Progress.Indicator bc="$color7" animation="bouncy" />
              </Progress>
            )}

            {!!errorMessage && <Paragraph theme="red">{errorMessage}</Paragraph>}
          </YStack>
        </form>
      )}
    </YStack>
  )
}
