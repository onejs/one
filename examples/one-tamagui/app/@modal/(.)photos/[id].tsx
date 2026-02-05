import { useState, useEffect } from 'react'
import { useParams, closeIntercept } from 'one'
import { Dialog, Button, XStack, YStack, Text, Image, Adapt, Sheet } from 'tamagui'
import { X } from '@tamagui/lucide-icons'

const getPhotoUrl = (id: string) =>
  `https://picsum.photos/id/${(parseInt(id) || 1) * 10}/600/400`

// Animation duration in ms - should match Tamagui's 'quick' animation
const EXIT_ANIMATION_DURATION = 200

/**
 * Photo modal using intercepting routes.
 *
 * This route intercepts /photos/[id] when navigating via Link (soft navigation).
 * The modal opens while the photo grid stays visible in the background.
 *
 * On hard navigation (direct URL, refresh), this route is NOT used.
 * Instead, the full page at /photos/[id] renders.
 */
export default function PhotoModal() {
  const { id = '1' } = useParams<{ id: string }>()
  const [isClosing, setIsClosing] = useState(false)

  const photo = {
    id,
    title: `Photo ${id}`,
    url: getPhotoUrl(id),
  }

  const handleClose = () => {
    if (isClosing) return // Prevent double-close
    setIsClosing(true)
  }

  // Delay navigation until exit animation completes
  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => {
        // Use closeIntercept instead of router.back() to properly
        // close the modal and restore the previous URL
        closeIntercept()
      }, EXIT_ANIMATION_DURATION)
      return () => clearTimeout(timer)
    }
  }, [isClosing])

  return (
    <Dialog modal open={!isClosing} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          transition="quick"
          opacity={0.7}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />

        <Dialog.Content
          bordered
          elevate
          key="content"
          transition={[
            '200ms',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          width="90%"
          maxW={500}
        >
          <XStack justify="space-between" items="center" mb="$3">
            <Dialog.Title fontSize="$6" testID="modal-title">
              {photo.title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button size="$3" circular icon={X} testID="modal-close-btn" />
            </Dialog.Close>
          </XStack>

          <Image
            source={{ uri: photo.url, width: 600, height: 400 }}
            width="100%"
            height={300}
            rounded="$4"
          />

          <YStack gap="$2" mt="$3" testID="modal-content">
            <Text color="$color11" fontSize="$3" testID="modal-route-info">
              Intercepting route: @modal/(.)photos/{id}
            </Text>
            <Text color="$color11" fontSize="$3">
              URL shows /photos/{id} - shareable!
            </Text>
            <Text color="$color11" fontSize="$3" mt="$2">
              Try refreshing - you'll see the full page version.
            </Text>
          </YStack>

          <Adapt when="sm" platform="touch">
            <Sheet
              transition="medium"
              zIndex={200000}
              modal
              dismissOnSnapToBottom
              snapPointsMode="fit"
            >
              <Sheet.Frame p="$4" gap="$4">
                <Adapt.Contents />
              </Sheet.Frame>
              <Sheet.Overlay
                transition="lazy"
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
              />
            </Sheet>
          </Adapt>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
