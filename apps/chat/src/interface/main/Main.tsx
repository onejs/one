import { memo } from 'react'
import { YStack } from 'tamagui'
import { MainMessageInput } from './MainMessageInput'
import { MainMessagesList } from './MainMessagesList'
import { MainOpenThread } from './MainOpenThread'
import { ChannelTopBar } from '../channel/ChannelTopBar'
import { mainTopBarHeight } from './constants'

export const Main = memo(() => {
  return (
    <YStack
      flex={1}
      shadowColor="$shadowColor"
      shadowRadius={3}
      shadowOffset={{ height: 2, width: 0 }}
      borderTopLeftRadius="$2"
      overflow="hidden"
      borderWidth={0.5}
      borderStyle="solid"
      borderColor="$color7"
    >
      <ChannelTopBar />
      <YStack mt={mainTopBarHeight} position="relative" flex={1} bg="$background04">
        <MainMessagesList />
        <MainOpenThread />
      </YStack>
    </YStack>
  )
})
