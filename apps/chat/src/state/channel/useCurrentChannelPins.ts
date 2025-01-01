import { useQuery } from '~/zero'
import { queryMessageItemRelations } from '../message/queryMessageItemRelations'
import { useUserState } from '../user'

export const useCurrentChannelPins = () => {
  const [_, { activeChannel }] = useUserState()
  return (
    useQuery((q) =>
      q.channel
        .where('id', activeChannel || '')
        .orderBy('createdAt', 'desc')
        .related('pins', (q) =>
          q
            .orderBy('createdAt', 'desc')
            .related('message', (q) => queryMessageItemRelations(q).one())
        )
    )[0]?.[0]?.pins || []
  )
}
