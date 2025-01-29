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
  View,
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
import { ButtonSimple } from '../buttons/ButtonSimple'
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
      height={mainTopBarHeight}
      position="absolute"
      t={0}
      l={0}
      r={0}
      bg="$color1"
      elevation={1}
      z={1000}
      gap="$4"
      py="$2"
      px="$2"
    >
      <XStack items="center" gap="$1">
        <ChannelViewToggle />
      </XStack>

      <XStack flex={10} items="center">
        {/* <IndentIncrease size={14} opacity={0.5} /> */}
        <ScrollView my="$-2" flex={2} horizontal showsHorizontalScrollIndicator={false}>
          <XStack p="$2" items="center" gap="$1">
            {threads.map((thread) => {
              return <ThreadButton key={thread.id} thread={thread} />
            })}
          </XStack>
        </ScrollView>
      </XStack>

      <XStack items="center" gap="$1">
        <ChannelPinsPopover />
        <ChannelSettingsPopover />
      </XStack>

      <AnimationDriver name="css">
        <XStack
          animation="quickest"
          position="absolute"
          inset={0}
          bg="$color1"
          z={10}
          pointerEvents="none"
          opacity={0}
          x={10}
          items="center"
          px="$3"
          gap="$3"
          // TODO type isnt nullish from zero
          {...(!!(openThread as any as boolean) && {
            opacity: 1,
            x: 0,
            pointerEvents: 'auto',
          })}
        >
          <XStack items="center" gap="$1">
            <Button
              pointerEvents={openThread ? 'auto' : 'none'}
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
              pointerEvents={openThread ? 'auto' : 'none'}
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
                  opacity={0}
                  fullscreen
                  items="center"
                  justify="center"
                  y={5}
                  {...(maximized && {
                    opacity: 1,
                    y: 0,
                  })}
                >
                  <Minimize2 size={16} />
                </YStack>
                <YStack
                  animation="quick"
                  opacity={0}
                  y={5}
                  fullscreen
                  items="center"
                  justify="center"
                  {...(!maximized && {
                    opacity: 1,
                    y: 0,
                  })}
                >
                  <Maximize2 size={16} />
                </YStack>
              </>
            </Button>
          </XStack>

          <XStack items="center" gap="$3">
            {/* <IndentIncrease opacity={0.5} size={14} /> */}
            <SizableText cursor="default" size="$5">
              {openThread?.description || 'Thread Name'}
            </SizableText>
          </XStack>

          <XStack flex={1} />

          <AnimationDriver name="spring">
            <XStack items="center" gap="$2">
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

  const activeProps: ButtonProps = {
    className: 'path-glow',
    opacity: 1,
  }

  const inactiveProps: ButtonProps = {
    bg: 'transparent',
    size: '$2',
    scaleIcon: 1.3,
    borderWidth: 0,
    rounded: 0,
    opacity: 0.5,
  }

  return (
    <XGroup overflow="hidden">
      <TooltipSimple label="Chat view">
        <View
          px="$2.5"
          py="$1.5"
          disabled={!channel}
          disabledStyle={{
            opacity: 0.5,
          }}
          {...inactiveProps}
          {...(view !== 'thread' && activeProps)}
          onPress={() => {
            updateUserCurrentChannel({
              mainView: 'chat',
            })
          }}
        >
          <MessageCircle size={26} viewBox="-8 -8 40 40" m={-6} />
        </View>
      </TooltipSimple>
      <TooltipSimple label="Thread view">
        <View
          px="$2.5"
          py="$1.5"
          {...inactiveProps}
          disabled={!channel}
          disabledStyle={{
            opacity: 0.5,
          }}
          {...(view === 'thread' && activeProps)}
          onPress={() => {
            updateUserCurrentChannel({
              mainView: 'thread',
            })
          }}
        >
          <IndentIncrease size={26} viewBox="-8 -8 40 40" m={-6} />
        </View>
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
      maxW={200}
      onPress={() => {
        updateUserOpenThread(thread)
      }}
    >
      <SizableText
        size="$3"
        maxW="100%"
        ellipse
        select="none"
        cursor="default"
        flex={1}
        overflow="hidden"
      >
        {thread.messages[0]?.content}
      </SizableText>
    </ButtonSimple>
  )
}
