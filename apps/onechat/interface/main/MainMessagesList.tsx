import { useCurrentMessages } from '~/features/state/queries/useServer'
import { MessagesList } from '../messages/MessagesList'

export const MainMessagesList = () => {
  const messages = useCurrentMessages() || []

  return <MessagesList messages={messages} />
}
