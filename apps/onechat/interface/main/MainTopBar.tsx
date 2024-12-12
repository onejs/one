import { MessageCircle } from '@tamagui/lucide-icons'
import { Circle, ScrollView, SizableText, XStack } from 'tamagui'
import type { Thread, ThreadWithRelations } from '~/config/zero/schema'
import { useCurrentChannelThreads } from '~/features/state/queries/useServer'
import { OneBall } from '../brand/Logo'
import { ButtonSimple } from '../ButtonSimple'
import { updateUserOpenThread } from '~/features/state/queries/useUserState'

export const MainTopBar = () => {
  const threads = useCurrentChannelThreads()

  return (
    <XStack pos="absolute" t={0} l={0} r={0} bg="$color1" elevation={4} zi={100_000}>
      <XStack p="$2" px="$3" ai="center" gap="$1">
        {/* <ThreadButtonFrame active>
              <Book size={18} />
            </ThreadButtonFrame> */}
        <ChatThreadButton />
      </XStack>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} ml={-20}>
        <XStack p="$2" px="$3" ai="center" gap="$1">
          {threads.map((thread) => {
            return <ThreadButton key={thread.id} thread={thread} />
          })}

          {/* <ThreadButton />
          <ThreadButton />
          <ThreadButton />
          <ThreadButton /> */}
        </XStack>
      </ScrollView>
    </XStack>
  )
}

const ChatThreadButton = () => {
  return (
    <ButtonSimple active>
      <MessageCircle size={20} />

      {/* <SizableText userSelect="none" cur="default" f={1} ov="hidden">
        Chat
      </SizableText> */}
    </ButtonSimple>
  )
}

const ThreadButton = ({ thread }: { thread: ThreadWithRelations }) => {
  return (
    <ButtonSimple
      onPress={() => {
        updateUserOpenThread(thread)
      }}
    >
      <Circle size={26} bg="$color9">
        <OneBall size={0.8} />
      </Circle>

      <SizableText userSelect="none" cur="default" f={1} ov="hidden">
        {thread.messages[0]?.content}
      </SizableText>
    </ButtonSimple>
  )
}
