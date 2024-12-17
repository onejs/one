import { useCurrentChannelMessages } from '~/features/state/queries/useServer'
import { MessagesList } from '../messages/MessagesList'
import { useCurrentThread } from '~/features/state/queries/useUserState'

export const MainMessagesList = () => {
  const messages = useCurrentChannelMessages() || []
  const hasOpenThread = !!useCurrentThread()

  return <MessagesList disableEvents={hasOpenThread} messages={messages} />
}
