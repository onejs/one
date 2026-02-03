import { useParams, closeIntercept } from 'one'
import { YStack, XStack, Text, Button } from 'tamagui'
import { useEffect, useState } from 'react'

/**
 * Intercepting route - modal version of item detail.
 * This route intercepts /intercept-test/items/[id] on soft navigation.
 *
 * The (.) prefix means "intercept at same level as this slot's parent layout".
 */
export default function ItemModal() {
  const { id } = useParams<{ id: string }>()
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    if (isClosing) return
    setIsClosing(true)
  }

  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => {
        closeIntercept()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isClosing])

  return (
    <YStack
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(0,0,0,0.5)"
      ai="center"
      jc="center"
      testID="intercept-modal-overlay"
      onPress={handleClose}
    >
      <YStack
        bg="$background"
        p="$4"
        borderRadius="$4"
        width="90%"
        maxWidth={400}
        gap="$3"
        testID="intercept-modal-content"
        onPress={(e: any) => e.stopPropagation()}
      >
        <XStack jc="space-between" ai="center">
          <Text fontSize="$5" fontWeight="bold" testID="modal-title">
            Item {id} (Modal)
          </Text>
          <Button size="$2" onPress={handleClose} testID="close-modal">
            Close
          </Button>
        </XStack>

        <YStack gap="$2">
          <Text testID="modal-indicator">
            This is the MODAL version (intercepting route).
          </Text>
          <Text color="$color11" fontSize="$2">
            Intercepting route: @modal/(.)items/[id]
          </Text>
          <Text color="$color11" fontSize="$2">
            URL shows /intercept-test/items/{id} - shareable!
          </Text>
          <Text color="$color11" fontSize="$2" testID="refresh-hint">
            Try refreshing - you'll see the full page version.
          </Text>
        </YStack>
      </YStack>
    </YStack>
  )
}
