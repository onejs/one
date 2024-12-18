import { useCurrentChannelMessages } from '~/src/state/queries/useServer'
import { MessagesList } from '../messages/MessagesList'
import { useCurrentThread } from '~/src/state/queries/useUserState'

export const MainMessagesList = () => {
  const messages = useCurrentChannelMessages() || []
  const hasOpenThread = !!useCurrentThread()

  return <MessagesList disableEvents={hasOpenThread} messages={messages} />
}
