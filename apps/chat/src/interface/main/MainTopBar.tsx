import { IndentIncrease, MessageCircle, Settings } from '@tamagui/lucide-icons'
import { useState } from 'react'
import {
  Button,
  type ButtonProps,
  Circle,
  H4,
  H5,
  Popover,
  ScrollView,
  SizableText,
  TooltipSimple,
  XGroup,
  XStack,
  YStack,
} from 'tamagui'
import type { ThreadWithRelations } from '~/zero/schema'
import { useCurrentChannel, useCurrentChannelThreads } from '~/state/queries/useServer'
import {
  updateUserCurrentChannel,
  updateUserOpenThread,
  useUserCurrentChannelState,
} from '~/state/queries/useUserState'
import { mutate } from '~/state/zero'
import { OneBall } from '../brand/Logo'
import { ButtonSimple } from '../ButtonSimple'
import { Checkbox } from '../Checkbox'
import { AlwaysVisibleTabContent } from '../dialogs/AlwaysVisibleTabContent'
import { LabeledRow } from '../forms/LabeledRow'
import { PopoverContent } from '../Popover'
import { Tabs } from '../tabs/Tabs'

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
  const channel = useCurrentChannel()
  const [tab, setTab] = useState('settings')

  if (!channel) {
    return null
  }

  return (
    <Popover allowFlip stayInFrame={{ padding: 10 }}>
      <Popover.Trigger>
        <TooltipSimple label="Channel settings">
          <Button chromeless size="$2.5" scaleIcon={1.3}>
            <Settings size={18} o={0.5} />
          </Button>
        </TooltipSimple>
      </Popover.Trigger>

      <PopoverContent miw={400} mih="calc(80vh)" p="$3">
        <H4>{channel.name}</H4>

        <Tabs
          initialTab="settings"
          onValueChange={setTab}
          tabs={[
            { label: 'Settings', value: 'settings' },
            { label: 'Members', value: 'members' },
          ]}
        >
          <YStack pos="relative" f={1} w="100%">
            <AlwaysVisibleTabContent active={tab} value="settings">
              <ChannelSettings />
            </AlwaysVisibleTabContent>

            <AlwaysVisibleTabContent active={tab} value="members">
              <ChannelMembers />
            </AlwaysVisibleTabContent>
          </YStack>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

const ChannelMembers = () => {
  // this will be for setting access based on roles
  return (
    <YStack>
      <H5>Members</H5>
    </YStack>
  )
}

const ChannelSettings = () => {
  const channel = useCurrentChannel()

  if (!channel) {
    return null
  }

  return (
    <>
      <LabeledRow htmlFor="private" label="Private">
        <Checkbox
          checked={channel.private}
          onCheckedChange={(val) => {
            mutate.channel.update({
              ...channel,
              private: !!val,
            })
          }}
          id="private"
          name="private"
        />
      </LabeledRow>
    </>
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

      <SizableText maw="100%" ellipse userSelect="none" cur="default" f={1} ov="hidden">
        {thread.messages[0]?.content}
      </SizableText>
    </ButtonSimple>
  )
}
