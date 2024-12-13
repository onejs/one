import { memo } from 'react'
import { YStack } from 'tamagui'
import { MainMessageInput } from './MainMessageInput'
import { MainMessagesList } from './MainMessagesList'
import { MainOpenThread } from './MainOpenThread'
import { MainTopBar, mainTopBarHeight } from './MainTopBar'

export const Main = memo(() => {
  return (
    <YStack f={1} shadowColor="$shadowColor" shadowRadius={30} btlr="$3" ov="hidden">
      <MainTopBar />
      <YStack mt={mainTopBarHeight} pos="relative" f={1} bg="$background05">
        <MainMessagesList />
        <MainMessageInput />
        <MainOpenThread />
      </YStack>
    </YStack>
  )
})
