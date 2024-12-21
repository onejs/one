import { memo } from 'react'
import { YStack } from 'tamagui'
import { MainMessageInput } from './MainMessageInput'
import { MainMessagesList } from './MainMessagesList'
import { MainOpenThread } from './MainOpenThread'
import { MainTopBar } from './MainTopBar'
import { mainTopBarHeight } from './constants'

export const Main = memo(() => {
  return (
    <YStack
      f={1}
      shadowColor="$shadowColor"
      shadowRadius={3}
      shadowOffset={{ height: 2, width: 0 }}
      btlr="$2"
      ov="hidden"
      bw={0.5}
      bs="solid"
      bc="$color7"
    >
      <MainTopBar />
      <YStack mt={mainTopBarHeight} pos="relative" f={1} bg="$background05">
        <MainMessagesList />
        <MainMessageInput />
        <MainOpenThread />
      </YStack>
    </YStack>
  )
})
