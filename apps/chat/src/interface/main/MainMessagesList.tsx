import { useCurrentChannelMessages } from '~/state/server'
import { MessagesList } from '../messages/MessagesList'
import { useCurrentThread } from '~/state/user'

export const MainMessagesList = () => {
  const messages = useCurrentChannelMessages() || []
  const hasOpenThread = !!useCurrentThread()

  return <MessagesList disableEvents={hasOpenThread} messages={messages} />
}
