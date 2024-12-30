import { YStack } from 'tamagui'
import { updateUserCurrentChannel, useCurrentThread } from '~/state/user'
import { AnimationDriver } from '../animations/AnimationDriver'
import { ButtonClose } from '../ButtonClose'
import { MessageInput } from '../messages/MessageInput'
import { MessagesList } from '../messages/MessagesList'

export const MainOpenThread = () => {
  const thread = useCurrentThread()

  return (
    <AnimationDriver name="css">
      <YStack
        bg="$color2"
        shadowColor="$shadowColor"
        shadowRadius={10}
        animation={[
          'quickest',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
        pos="absolute"
        t={0}
        r={0}
        b={0}
        w="70%"
        zi={1000}
        {...(thread
          ? {
              opacity: 1,
              x: 0,
            }
          : {
              opacity: 0,
              pe: 'none',
              x: 7,
            })}
      >
        <ButtonClose
          pos="absolute"
          zi={1000}
          t={10}
          l={-20}
          onPress={() => {
            updateUserCurrentChannel({
              openedThreadId: undefined,
            })
          }}
        />
        {thread && (
          <>
            <MessagesList messages={thread?.messages || []} />
            <MessageInput inThread />
          </>
        )}
      </YStack>
    </AnimationDriver>
  )
}
