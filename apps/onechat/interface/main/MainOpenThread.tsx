import { YStack } from 'tamagui'
import { updateUserCurrentChannel, useUserOpenThread } from '~/features/state/queries/useUserState'
import { ButtonClose } from '../ButtonClose'
import { MessagesList } from '../messages/MessagesList'
import { MessageInput } from '../messages/MessageInput'

export const MainOpenThread = () => {
  const thread = useUserOpenThread()

  if (!thread) {
    return null
  }

  console.log('thread', thread)

  return (
    <YStack bg="$color1" elevation="$4" pos="absolute" t={0} r={0} b={0} w="80%" zi={1000}>
      <ButtonClose
        onPress={() => {
          updateUserCurrentChannel({
            openedThreadId: undefined,
          })
        }}
      />
      <MessagesList messages={thread?.messages || []} />
      <MessageInput />
    </YStack>
  )
}
