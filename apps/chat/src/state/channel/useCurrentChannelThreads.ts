import { useQuery } from '~/zero'
import { useUserState } from '../user'

export const useCurrentChannelThreads = () => {
  const [_, { activeChannel }] = useUserState()
  return (
    useQuery((q) =>
      q.channel
        .where('id', activeChannel || '')
        .orderBy('createdAt', 'desc')
        .related('threads', (q) =>
          q
            .orderBy('createdAt', 'desc')
            .related('messages', (q) => q.limit(1).orderBy('createdAt', 'asc'))
        )
    )[0]?.[0]?.threads || []
  )
}
