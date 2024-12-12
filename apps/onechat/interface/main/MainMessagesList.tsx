import { IndentIncrease, MoreVertical, Reply } from '@tamagui/lucide-icons'
import { useEffect, useRef } from 'react'
import {
  Button,
  ScrollView,
  Separator,
  SizableText,
  type TamaguiElement,
  TooltipSimple,
  XGroup,
  XStack,
  YStack,
} from 'tamagui'
import type { Message, User } from '~/config/zero/schema'
import { useAuth } from '~/features/auth/useAuth'
import { useCurrentMessages } from '~/features/state/queries/useServer'
import { Avatar } from '~/interface/Avatar'

export const MainMessagesList = () => {
  const messages = useCurrentMessages() || []
  const { user } = useAuth()
  const scrollViewRef = useRef<TamaguiElement>(null)

  useEffect(() => {
    if (scrollViewRef.current instanceof HTMLElement) {
      scrollViewRef.current.scrollTop = 100_000
    }
  }, [messages])

  return (
    <YStack ov="hidden" f={1}>
      <YStack f={100} />
      <ScrollView ref={scrollViewRef as any}>
        <YStack pt="$10">
          {user
            ? messages.map((message, index) => {
                const lastMessage = messages[index - 1]
                return (
                  <MessageItem
                    hideUser={lastMessage?.senderId === message.senderId}
                    key={message.id}
                    message={message}
                    user={user as any}
                  />
                )
              })
            : null}
        </YStack>
      </ScrollView>
    </YStack>
  )
}

const MessageItem = ({
  message,
  user,
  hideUser,
}: { message: Message; user: User; hideUser?: boolean }) => {
  return (
    <XStack
      f={1}
      gap="$3"
      py={hideUser ? '$1.5' : '$2.5'}
      px="$4"
      group="message"
      hoverStyle={{
        bg: '$background025',
      }}
    >
      <XStack
        pos="absolute"
        t={-8}
        r={8}
        o={0}
        elevation="$0.5"
        br="$4"
        zi={1000}
        $group-message-hover={{ o: 1 }}
      >
        <XGroup bg="$color2">
          <Button chromeless size="$2.5">
            🙏
          </Button>
          <Button chromeless size="$2.5">
            🥺
          </Button>
          <Button chromeless size="$2.5">
            😊
          </Button>

          <Separator my="$2" vertical />

          <TooltipSimple label="Create Thread">
            <Button chromeless size="$2.5" br={0}>
              <IndentIncrease size={16} />
            </Button>
          </TooltipSimple>

          <TooltipSimple label="Quote Reply">
            <Button chromeless size="$2.5" br={0}>
              <Reply size={16} />
            </Button>
          </TooltipSimple>

          <Button chromeless size="$2.5">
            <MoreVertical size={16} />
          </Button>
        </XGroup>
      </XStack>

      <XStack w={32}>{!hideUser && <Avatar image={user.image} />}</XStack>

      <YStack f={1} gap="$1">
        {!hideUser && (
          <SizableText o={0.5} mb={-4} fow="bold">
            {user.username || user.name}
          </SizableText>
        )}

        <SizableText f={1} ov="hidden">
          {message.content}
        </SizableText>
      </YStack>
    </XStack>
  )
}
