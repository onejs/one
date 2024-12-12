import { useCurrentChannelMessages } from '~/features/state/queries/useServer'
import { MessagesList } from '../messages/MessagesList'

export const MainMessagesList = () => {
  const messages = useCurrentChannelMessages() || []

  return <MessagesList messages={messages} />
}
