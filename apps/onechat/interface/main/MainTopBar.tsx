import { IndentIncrease, MessageCircle } from '@tamagui/lucide-icons'
import {
  Button,
  ButtonProps,
  Circle,
  ScrollView,
  SizableText,
  TooltipSimple,
  XGroup,
  XStack,
} from 'tamagui'
import type { ThreadWithRelations } from '~/config/zero/schema'
import { useCurrentChannelThreads } from '~/features/state/queries/useServer'
import {
  updateUserCurrentChannel,
  updateUserOpenThread,
  useUserCurrentChannelState,
} from '~/features/state/queries/useUserState'
import { OneBall } from '../brand/Logo'
import { ButtonSimple } from '../ButtonSimple'

export const mainTopBarHeight = 45

export const MainTopBar = () => {
  const threads = useCurrentChannelThreads()

  return (
    <XStack
      h={mainTopBarHeight}
      pos="absolute"
      t={0}
      l={0}
      r={0}
      bg="$color1"
      elevation={4}
      zi={100_000}
    >
      <XStack p="$2" px="$3" ai="center" gap="$1">
        <ChannelViewToggle />
      </XStack>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} ml={-20}>
        <XStack p="$2" px="$3" ai="center" gap="$1">
          {threads.map((thread) => {
            return <ThreadButton key={thread.id} thread={thread} />
          })}
        </XStack>
      </ScrollView>
    </XStack>
  )
}

const ChannelViewToggle = () => {
  const channelState = useUserCurrentChannelState()
  const view = channelState.mainView

  const activeStyle: ButtonProps = {
    bg: 'transparent',
  }

  return (
    <XGroup overflow="hidden" borderWidth={1} borderColor="$borderColor">
      <TooltipSimple label="Chat view">
        <Button
          size="$2.5"
          scaleIcon={1.5}
          icon={MessageCircle}
          borderWidth={0}
          borderRadius={0}
          {...(view !== 'thread' && activeStyle)}
          onPress={() => {
            updateUserCurrentChannel({
              mainView: 'chat',
            })
          }}
        />
      </TooltipSimple>
      <TooltipSimple label="Thread view">
        <Button
          size="$2.5"
          scaleIcon={1.5}
          icon={IndentIncrease}
          borderWidth={0}
          borderRadius={0}
          {...(view === 'thread' && activeStyle)}
          onPress={() => {
            updateUserCurrentChannel({
              mainView: 'thread',
            })
          }}
        />
      </TooltipSimple>
    </XGroup>
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
