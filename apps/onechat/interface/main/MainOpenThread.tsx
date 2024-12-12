import { H2, YStack } from 'tamagui'
import { ButtonClose } from '../ButtonClose'
import {
  updateUserCurrentChannel,
  updateUserState,
  useUserCurrentChannelState,
  useUserState,
} from '~/features/state/queries/useUserState'

export const MainOpenThread = () => {
  const { openedThreadId } = useUserCurrentChannelState()

  if (!openedThreadId) {
    return null
  }

  return (
    <YStack bg="$color1" elevation="$4" pos="absolute" t={0} r={0} b={0} w="80%" zi={1000}>
      <ButtonClose
        onPress={() => {
          updateUserCurrentChannel({
            openedThreadId: undefined,
          })
        }}
      />
      <H2>Open thred</H2>
    </YStack>
  )
}
