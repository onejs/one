import { useUserState } from '~/state/user'
import { useQuery } from '~/zero'

export const useCurrentThreadWithMessages = () => {
  const [_, { activeThread }] = useUserState()
  const [thread] = useQuery((q) =>
    q.thread.where('id', activeThread?.openedThreadId || '').related('messages', (q) =>
      q
        .orderBy('createdAt', 'asc')
        .related('reactions')
        .related('sender', (q) => q.one())
        .related('replyingTo', (q) => q.one().related('sender', (q) => q.one()))
        .related('attachments')
    )
  )
  return thread[0]
}

export const useCurrentThread = () => {
  const [_, { activeThread }] = useUserState()
  const [thread] = useQuery((q) => q.thread.where('id', activeThread?.openedThreadId || ''))
  return thread[0]
}
