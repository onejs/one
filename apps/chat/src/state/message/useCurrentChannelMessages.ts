import { useUserState } from '~/state/user'
import { Message, useQuery } from '~/zero'
import { queryMessageItemRelations } from './queryMessageItemRelations'

export const useCurrentChannelMessages = () => {
  const [userState, { activeChannel, activeChannelState }] = useUserState()
  return (
    useQuery((q) =>
      q.server
        .where('id', userState?.activeServer || '')
        .orderBy('createdAt', 'desc')
        .related('channels', (q) =>
          q.where('id', activeChannel || '').related('messages', (q) =>
            queryMessageItemRelations(
              q
                .where('deleted', '!=', true)
                .orderBy('createdAt', 'asc')
                // dont get threaded messages
                .where('isThreadReply', false)
                .where(({ exists, cmp }) =>
                  activeChannelState?.mainView === 'thread'
                    ? exists('thread')
                    : cmp('isThreadReply', false)
                )
            )
          )
        )
    )[0][0]?.channels?.[0]?.messages || []
  )
}
