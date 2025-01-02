import {
  IndentIncrease,
  Maximize2,
  MessageCircle,
  Minimize2,
  Pencil,
  Trash,
  X,
} from '@tamagui/lucide-icons'
import {
  Button,
  ScrollView,
  SizableText,
  TooltipSimple,
  XGroup,
  XStack,
  YStack,
  type ButtonProps,
} from 'tamagui'
import { useCurrentChannel } from '~/state/channel/useCurrentChannel'
import { useCurrentChannelThreads } from '~/state/channel/useCurrentChannelThreads'
import { useCurrentThread, useCurrentThreadWithMessages } from '~/state/message/useCurrentThread'
import {
  closeCurrentThread,
  updateUserCurrentChannel,
  updateUserOpenThread,
  useUserCurrentChannelState,
} from '~/state/user'
import { zero, type ThreadWithRelations } from '~/zero'
import { AnimationDriver } from '../animations/AnimationDriver'
import { ButtonSimple } from '../ButtonSimple'
import { dialogConfirm } from '../dialogs/actions'
import { mainTopBarHeight } from '../main/constants'
import { showToast } from '../toast/Toast'
import { ChannelPinsPopover } from './ChannelPinsPopover'
import { ChannelSettingsPopover } from './ChannelSettingsPopover'

export const ChannelTopBar = () => {
  const threads = useCurrentChannelThreads()
  const openThread = useCurrentThread()
  const channelState = useUserCurrentChannelState()
  const maximized = channelState?.maximized

  return (
    <XStack
      h={mainTopBarHeight}
      pos="absolute"
      t={0}
      l={0}
      r={0}
      bg="$color1"
      elevation={1}
      zi={100_000}
      gap="$4"
      py="$2"
      px="$2"
    >
      <XStack ai="center" gap="$1">
        <ChannelViewToggle />
      </XStack>

      <XStack f={10} ai="center">
        <IndentIncrease size={14} o={0.5} />
        <ScrollView my="$-2" f={2} horizontal showsHorizontalScrollIndicator={false}>
          <XStack p="$2" ai="center" gap="$1">
            {threads.map((thread) => {
              return <ThreadButton key={thread.id} thread={thread} />
            })}
          </XStack>
        </ScrollView>
      </XStack>

      <XStack ai="center" gap="$1">
        <ChannelPinsPopover />
        <ChannelSettingsPopover />
      </XStack>

      <AnimationDriver name="css">
        <XStack
          animation="quickest"
          pos="absolute"
          inset={0}
          bg="$color1"
          zi={10}
          pe="none"
          o={0}
          x={10}
          ai="center"
          px="$3"
          gap="$3"
          // TODO type isnt nullish from zero
          {...(!!(openThread as any as boolean) && {
            o: 1,
            x: 0,
            pe: 'auto',
          })}
        >
          <XStack ai="center" gap="$1">
            <Button
              pe="auto"
              size="$2.5"
              bg="transparent"
              circular
              onPress={() => {
                closeCurrentThread()
              }}
              scaleIcon={1.4}
              icon={X}
            />

            <Button
              pe="auto"
              size="$2.5"
              bg="transparent"
              circular
              onPress={() => {
                updateUserCurrentChannel({
                  maximized: !maximized,
                })
              }}
            >
              <>
                <YStack
                  animation="quick"
                  o={0}
                  fullscreen
                  ai="center"
                  jc="center"
                  y={5}
                  {...(maximized && {
                    o: 1,
                    y: 0,
                  })}
                >
                  <Minimize2 size={16} />
                </YStack>
                <YStack
                  animation="quick"
                  o={0}
                  y={5}
                  fullscreen
                  ai="center"
                  jc="center"
                  {...(!maximized && {
                    o: 1,
                    y: 0,
                  })}
                >
                  <Maximize2 size={16} />
                </YStack>
              </>
            </Button>
          </XStack>

          <XStack ai="center" gap="$3">
            {/* <IndentIncrease o={0.5} size={14} /> */}
            <SizableText cur="default" size="$5">
              {openThread?.description || 'Thread Name'}
            </SizableText>
          </XStack>

          <XStack f={1} />

          <AnimationDriver name="spring">
            <XStack ai="center" gap="$2">
              <ButtonSimple icon={Pencil}></ButtonSimple>
              <ButtonSimple
                icon={Trash}
                tooltip="Delete thread"
                onPress={async () => {
                  if (
                    !(await dialogConfirm({
                      title: `Delete thread?`,
                      description: `This will delete 100 messages.`,
                    }))
                  ) {
                    return
                  }

                  closeCurrentThread()

                  await zero.mutateBatch((tx) => {
                    tx.message.update({
                      id: openThread.messageId,
                      threadId: null,
                    })
                    tx.thread.update({
                      id: openThread.id,
                      deleted: true,
                    })
                  })

                  showToast(`Deleted`)
                }}
              ></ButtonSimple>
            </XStack>
          </AnimationDriver>
        </XStack>
      </AnimationDriver>
    </XStack>
  )
}

const ChannelViewToggle = () => {
  const channelState = useUserCurrentChannelState()
  const channel = useCurrentChannel()
  const view = channelState?.mainView

  const activeStyle: ButtonProps = {
    bg: '$color2',
  }

  const inactiveStyle: ButtonProps = {
    bg: 'transparent',
    size: '$2',
    scaleIcon: 1.3,
    borderWidth: 0,
    borderRadius: 0,
  }

  return (
    <XGroup overflow="hidden" borderWidth={1} borderColor="$borderColor">
      <TooltipSimple label="Chat view">
        <Button
          disabled={!channel}
          disabledStyle={{
            o: 0.5,
          }}
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
          disabled={!channel}
          disabledStyle={{
            o: 0.5,
          }}
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
  const currentThread = useCurrentThreadWithMessages()
  const isOpen = currentThread?.id === thread.id

  return (
    <ButtonSimple
      active={isOpen}
      maw={200}
      onPress={() => {
        updateUserOpenThread(thread)
      }}
    >
      <SizableText size="$3" maw="100%" ellipse userSelect="none" cur="default" f={1} ov="hidden">
        {thread.messages[0]?.content}
      </SizableText>
    </ButtonSimple>
  )
}
