import { MessageCircle } from '@tamagui/lucide-icons'
import { memo } from 'react'
import { Circle, ScrollView, SizableText, XStack, YStack } from 'tamagui'
import { OneBall } from '~/interface/brand/Logo'
import { ButtonSimple } from '../ButtonSimple'
import { MainMessageInput } from './MainMessageInput'
import { MainMessagesList } from './MainMessagesList'
import { MainOpenThread } from './MainOpenThread'

export const Main = memo(() => {
  return (
    <YStack f={1} shadowColor="$shadowColor" shadowRadius={30} btlr="$3" ov="hidden">
      <RecentThreads />
      <YStack f={1} bg="$background05">
        <MainMessagesList />
        <MainMessageInput />
        <MainOpenThread />
      </YStack>
    </YStack>
  )
})

const RecentThreads = () => {
  return (
    <XStack pos="absolute" t={0} l={0} r={0} bg="$color1" elevation={4} zi={100}>
      <XStack p="$2" px="$3" ai="center" gap="$1">
        {/* <ThreadButtonFrame active>
          <Book size={18} />
        </ThreadButtonFrame> */}
        <ChatThreadButton />
      </XStack>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} ml={-20}>
        <XStack p="$2" px="$3" ai="center" gap="$1">
          <ThreadButton />
          <ThreadButton />
          <ThreadButton />
          <ThreadButton />
        </XStack>
      </ScrollView>
    </XStack>
  )
}

const ChatThreadButton = () => {
  return (
    <ButtonSimple active>
      <MessageCircle size={20} />

      <SizableText userSelect="none" cur="default" f={1} ov="hidden">
        Chat
      </SizableText>
    </ButtonSimple>
  )
}

const ThreadButton = () => {
  return (
    <ButtonSimple>
      <Circle size={26} bg="$color9">
        <OneBall size={0.8} />
      </Circle>

      <SizableText userSelect="none" cur="default" f={1} ov="hidden">
        Some Thread
      </SizableText>
    </ButtonSimple>
  )
}
