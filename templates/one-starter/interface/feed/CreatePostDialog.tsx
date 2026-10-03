import { Dialog } from '~/interface/ui/dialog/Dialog'
import { TextArea } from '~/interface/ui/forms/TextArea'
import { Image } from '~/interface/ui/image/Image'
import { dismissKeyboard } from '~/interface/ui/keyboard/KeyboardLayoutFrame'
import { useMutation } from 'on-zero'
import { One } from 'one'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Circle, isWeb, SizableText, Spinner, useWindowDimensions, YStack } from 'tamagui'
import { useSession } from '~/auth/client/authClient'
import { zero } from '~/data/zero-client'
import { randomId } from '~/helpers/randomId'
import { Button } from '~/interface/buttons/Button'
import { Pressable } from '~/interface/buttons/Pressable'
import { Icons } from '~/interface/icons'
import { uploadFile } from '~/interface/upload/uploadFile'

type NativePickedFile = {
  uri: string
  name: string
  type: string
  size: number
  lastModified: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePostDialog({ open, onOpenChange }: Props) {
  const { data: session } = useSession()
  const { width } = useWindowDimensions()
  const minW = isWeb ? Math.min(500, width * 0.9) : width * 0.9
  const [caption, setCaption] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageDims, setImageDims] = useState<{ width: number; height: number } | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [createPost] = useMutation((props: Parameters<typeof zero.mutate.post.insert>[0]) =>
    zero.mutate.post.insert(props),
  )

  const resetPickedImage = useCallback(() => {
    setImagePreview(null)
    setImageUrl(null)
    setImageDims(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setCaption('')
      resetPickedImage()
      setError(null)
      setUploading(false)
    }
  }, [open, resetPickedImage])

  const uploadPickedFile = async (file: File | NativePickedFile) => {
    setUploading(true)
    setError(null)
    try {
      const result = await uploadFile(file)
      setImageUrl(result.url)
    } catch (err) {
      setError(`Upload failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setUploading(false)
    }
  }

  const onPickFile = async (file: File) => {
    const blobUrl = URL.createObjectURL(file)
    setImagePreview(blobUrl)

    const img = new window.Image()
    img.onload = () => setImageDims({ width: img.width, height: img.height })
    img.src = blobUrl

    await uploadPickedFile(file)
  }

  const handleSelectImage = () => {
    if (isWeb) {
      fileInputRef.current?.click()
      return
    }

    dismissKeyboard()

    One.ImagePicker.launchLibrary({ mediaTypes: 'images' }).then((result) => {
      const asset = result.canceled ? null : (result.assets[0] ?? null)
      if (!asset) return
      setImagePreview(asset.uri)
      if (asset.width && asset.height) {
        setImageDims({ width: asset.width, height: asset.height })
      }

      void uploadPickedFile({
        uri: asset.uri,
        name: asset.fileName ?? `image-${Date.now()}`,
        type: asset.mimeType ?? 'application/octet-stream',
        size: asset.fileSize || 0,
        lastModified: Date.now(),
      })
    })
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const onSubmit = () => {
    if (!session?.user || !imageUrl) return
    One.Haptics.notification('success')
    // optimistic: the post lands in the feed instantly, close the dialog now. a
    // server rejection rolls the post back and surfaces via onMutationError.
    createPost({
      id: randomId(),
      image: imageUrl,
      imageWidth: imageDims?.width ?? null,
      imageHeight: imageDims?.height ?? null,
      caption: caption.trim() || null,
      createdAt: Date.now(),
    })
    onOpenChange(false)
  }

  // caption is optional (stored as null when empty) — an image is the only requirement
  const canPost = !!imageUrl && !uploading

  return (
    <Dialog
      minH={500}
      minW={minW}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose()
      }}
    >
      {isWeb && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          data-testid="create-post-file-input"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) void onPickFile(file)
          }}
        />
      )}
      <Dialog.Header title="Create Post" />
      <Dialog.Body>
        <YStack gap={18}>
          <TextArea
            verticalAlign="top"
            maxLength={6000}
            rows={3}
            size="lg"
            aria-label="Post caption"
            placeholder="What's on your mind?"
            value={caption}
            onChangeText={(val) => setCaption(val)}
            autoFocus={isWeb}
            enterKeyHint="done"
            submitBehavior="blurAndSubmit"
            data-testid="create-post-caption"
            testID="create-post-caption"
          />

          {imagePreview && (
            <YStack
              position="relative"
              rounded="6"
              overflow="hidden"
              aspectRatio={1}
              bg="background/40"
              data-testid="create-post-image-preview"
              testID="create-post-image-preview"
            >
              <Image src={imagePreview} width="100%" height="100%" objectFit="contain" />
              {uploading && (
                <YStack
                  position="absolute"
                  t={0}
                  l={0}
                  r={0}
                  b={0}
                  bg="background"
                  opacity={0.8}
                  items="center"
                  justify="center"
                >
                  <Spinner size="large" />
                  <SizableText mt={7} size="3">
                    Uploading...
                  </SizableText>
                </YStack>
              )}
              {!uploading && (
                <Pressable
                  aria-label="Remove image"
                  position="absolute"
                  t="3"
                  r="3"
                  onPress={() => {
                    resetPickedImage()
                  }}
                >
                  <Circle size={36} bg="background" items="center" justify="center">
                    <Icons.Close size={20} color="color-11" />
                  </Circle>
                </Pressable>
              )}
            </YStack>
          )}

          {!imagePreview && (
            <Pressable
              aria-label="Add image"
              onPress={handleSelectImage}
              disabled={uploading}
              data-testid="create-post-image-picker"
              testID="create-post-image-picker"
            >
              <YStack
                borderWidth={2}
                borderColor="border-color"
                borderStyle="dashed"
                rounded="6"
                p="8"
                items="center"
                justify="center"
                gap={13}
                bg="background/20"
              >
                <Circle size={56} bg="background/40" items="center" justify="center">
                  <Icons.Photo size={28} color="color-11" />
                </Circle>
                <YStack items="center" gap={7}>
                  <SizableText size="5" fontWeight="600">
                    Add Image
                  </SizableText>
                  <SizableText size="3" color="color">
                    {isWeb ? 'Click to select' : 'Tap to select from library'}
                  </SizableText>
                </YStack>
              </YStack>
            </Pressable>
          )}
          {error ? (
            <SizableText color="red-900" data-testid="post-error" testID="post-error">
              {error}
            </SizableText>
          ) : null}
        </YStack>
      </Dialog.Body>

      <Dialog.Footer>
        <Button onPress={handleClose}>Cancel</Button>
        <Button
          accent
          onPress={onSubmit}
          disabled={!canPost}
          data-testid="create-post-submit"
          testID="create-post-submit"
        >
          Post
        </Button>
      </Dialog.Footer>
    </Dialog>
  )
}
