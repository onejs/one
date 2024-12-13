import { IndentIncrease, MessageCircle, Settings } from '@tamagui/lucide-icons'
import {
  Button,
  type ButtonProps,
  Circle,
  H4,
  Popover,
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
import { PopoverContent } from '../Popover'

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
      py="$2"
      px="$2"
    >
      <XStack ai="center" gap="$1">
        <ChannelViewToggle />
      </XStack>

      <ScrollView my="$-2" f={2} horizontal showsHorizontalScrollIndicator={false}>
        <XStack p="$2" ai="center" gap="$1">
          {threads.map((thread) => {
            return <ThreadButton key={thread.id} thread={thread} />
          })}
        </XStack>
      </ScrollView>

      <XStack ai="center">
        <ChannelSettingsButton />
      </XStack>
    </XStack>
  )
}

const ChannelSettingsButton = () => {
  return (
    <Popover allowFlip stayInFrame={{ padding: 10 }}>
      <Popover.Trigger>
        <TooltipSimple label="Channel Settings">
          <Button chromeless size="$2.5" scaleIcon={1.3}>
            <Settings size={18} o={0.5} />
          </Button>
        </TooltipSimple>
      </Popover.Trigger>

      <PopoverContent miw={300} mih={400} p="$3">
        <H4>Channel Settings</H4>
      </PopoverContent>
    </Popover>
  )
}

const ChannelViewToggle = () => {
  const channelState = useUserCurrentChannelState()
  const view = channelState.mainView

  const activeStyle: ButtonProps = {
    bg: '$color2',
  }

  const inactiveStyle: ButtonProps = {
    bg: 'transparent',
    size: '$2.5',
    scaleIcon: 1.3,
    borderWidth: 0,
    borderRadius: 0,
  }

  return (
    <XGroup overflow="hidden" borderWidth={1} borderColor="$borderColor">
      <TooltipSimple label="Chat view">
        <Button
          {...inactiveStyle}
          icon={MessageCircle}
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
          {...inactiveStyle}
          icon={IndentIncrease}
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
