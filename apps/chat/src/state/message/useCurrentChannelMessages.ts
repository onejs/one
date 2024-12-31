import { useUserState } from '~/state/user'
import { useQuery } from '~/zero'

export const useCurrentChannelMessages = () => {
  const [userState, { activeChannel, activeChannelState }] = useUserState()
  return (
    useQuery((q) =>
      q.server
        .where('id', userState?.activeServer || '')
        .orderBy('createdAt', 'desc')
        .related('channels', (q) =>
          q.where('id', activeChannel || '').related('messages', (q) =>
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
              .related('reactions')
              .related('thread', (q) => q.one())
              .related('sender', (q) => q.one())
              .related('replyingTo', (q) =>
                q
                  .one()
                  .where('deleted', '!=', true)
                  .related('sender', (q) => q.one())
              )
              .related('attachments')
          )
        )
    )[0][0]?.channels?.[0]?.messages || []
  )
}
