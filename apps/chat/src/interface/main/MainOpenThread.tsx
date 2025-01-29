import { YStack } from 'tamagui'
import { useCurrentThreadWithMessages } from '~/state/message/useCurrentThread'
import { useUserCurrentChannelState } from '~/state/user'
import { AnimationDriver } from '../animations/AnimationDriver'
import { MessageInput } from '../messages/MessageInput'
import { MessagesList } from '../messages/MessagesList'

export const MainOpenThread = () => {
  const thread = useCurrentThreadWithMessages()
  const channelState = useUserCurrentChannelState()
  const maximized = channelState?.maximized

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
        position="absolute"
        t={0}
        r={0}
        b={0}
        width="70%"
        z={1000}
        {...(maximized && {
          width: '100%',
        })}
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
        {/* <YStack zi={1000} position="absolute" t={10} l={-20} justify="center" gap="$3">
          <ButtonClose
            onPress={() => {
              closeCurrentThread()
            }}
          />

          <Button
            onPress={() => {
              updateUserCurrentChannel({
                maximized: true,
              })
            }}
            size="$2"
            ml={4}
            elevation={2}
            circular
            icon={Maximize}
            scaleIcon={1.1}
          ></Button>
        </YStack> */}

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
