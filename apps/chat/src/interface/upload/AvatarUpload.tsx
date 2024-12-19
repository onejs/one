import type React from 'react'
import { type DragEvent, useState } from 'react'
import { Paragraph, Progress, YStack } from 'tamagui'
import { Avatar } from '../Avatar'

interface UploadResponse {
  url?: string
  error?: string
}

export const AvatarUpload = ({
  defaultImage,
  onChangeImage,
}: { defaultImage?: string; onChangeImage: (cb: string) => void }) => {
  const [uploadUrl, setUploadUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [dropping, setDropping] = useState(false)
  const endpoint = `/api/image/upload`

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleUpload = (file: File) => {
    if (!file) {
      setErrorMessage('Please select a file to upload.')
      return
    }

    setProgress(10)

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded * 100) / event.total)
        setProgress(percentage)
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response: UploadResponse = JSON.parse(xhr.response)

        if (response.url) {
          setProgress(0)
          setUploadUrl(response.url)
          onChangeImage(response.url)
        } else {
          setErrorMessage('Upload failed: ' + (response.error || 'No error message provided.'))
        }
      } else {
        setErrorMessage(`Upload failed with status: ${xhr.status}`)
      }
    }

    xhr.onerror = () => {
      setErrorMessage('Upload error: An error occurred while uploading the file.')
    }

    xhr.send(formData)
  }

  return (
    <YStack
      gap="$4"
      // @ts-expect-error
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setDropping(false)
        const file = event.dataTransfer.files[0]
        if (file) handleUpload(file)
      }}
      onDragOver={(e) => {
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
      <Avatar size={100} image={uploadUrl || defaultImage} />

      <form action={endpoint} method="post" encType="multipart/form-data">
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
    </YStack>
  )
}
