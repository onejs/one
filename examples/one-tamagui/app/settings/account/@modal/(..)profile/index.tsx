import { useState, useEffect } from 'react'
import { closeIntercept } from 'one'
import { Dialog, Button, XStack, YStack, Text, Image, Adapt, Sheet } from 'tamagui'
import { X, Check } from '@tamagui/lucide-icons'

// Animation duration in ms - should match Tamagui's 'quick' animation
const EXIT_ANIMATION_DURATION = 200

/**
 * Profile modal - intercepts /settings/profile when navigating from /settings/account.
 *
 * The (..) prefix means "go up one level" from the @modal directory.
 * So from /settings/account/@modal/, (..)profile matches /settings/profile.
 */
export default function ProfileModal() {
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    if (isClosing) return // Prevent double-close
    setIsClosing(true)
  }

  // Delay navigation until exit animation completes
  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => {
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
          testID="profile-modal"
        >
          <XStack justify="space-between" items="center" mb="$3">
            <Dialog.Title fontSize="$6">Edit Profile</Dialog.Title>
            <Dialog.Close asChild>
              <Button size="$3" circular icon={X} testID="close-profile-modal" />
            </Dialog.Close>
          </XStack>

          <YStack items="center" gap="$4" py="$2">
            <Image
              source={{ uri: 'https://picsum.photos/200/200', width: 200, height: 200 }}
              width={100}
              height={100}
              rounded={50}
            />

            <YStack gap="$2" width="100%">
              <Text fontSize="$3" color="$color11">
                Name
              </Text>
              <XStack
                p="$3"
                bg="$color2"
                rounded="$3"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <Text>John Doe</Text>
              </XStack>
            </YStack>

            <YStack gap="$2" width="100%">
              <Text fontSize="$3" color="$color11">
                Email
              </Text>
              <XStack
                p="$3"
                bg="$color2"
                rounded="$3"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <Text>john.doe@example.com</Text>
              </XStack>
            </YStack>
          </YStack>

          <YStack p="$3" bg="$green2" rounded="$4" mt="$2">
            <Text color="$green11" fontSize="$3">
              This modal uses (..) intercepting route!
            </Text>
            <Text color="$green11" fontSize="$2" mt="$1">
              URL shows /settings/profile but you're still on the account page.
            </Text>
          </YStack>

          <XStack gap="$3" justify="flex-end" mt="$4">
            <Dialog.Close asChild>
              <Button>Cancel</Button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <Button theme="blue" icon={Check}>
                Save Changes
              </Button>
            </Dialog.Close>
          </XStack>

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
