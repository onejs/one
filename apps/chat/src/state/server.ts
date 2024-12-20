import { useAuth } from '~/better-auth/authClient'
import { useQuery } from '../zero/zero'
import { useUserState } from './user'

export const useServersQuery = () => useQuery((q) => q.server)[0]

export const useCurrentServer = () => {
  const [userState] = useUserState()
  return useQuery((q) => q.server.where('id', userState?.activeServer || ''))[0][0]
}

export const useCurrentServerMembership = () => {
  const [userState, { user }] = useUserState()
  return useQuery((q) =>
    q.serverMember.where('userId', userState?.activeServer || '').where('serverId', user?.id || '')
  )[0][0]
}

export const useUser = () => {
  const { user } = useAuth()
  return useQuery((q) => q.user.where('id', user?.id || '').limit(1))[0][0]
}

export const useFriends = () => {
  const { user } = useAuth()
  return (
    useQuery((q) =>
      q.user
        .where('id', user?.id || '')
        .limit(1)
        .related('friends')
    )[0][0]?.friends || []
  )
}

export const useUserServers = () => {
  const { user } = useAuth()
  return (
    useQuery((q) =>
      q.user
        .limit(1)
        .where('id', user?.id || '')
        .related('servers')
    )[0][0]?.servers || []
  )
}

export const useServerChannels = () => {
  const [userState] = useUserState()
  return (
    useQuery((q) =>
      q.server
        .where('id', userState?.activeServer || '')
        .orderBy('createdAt', 'desc')
        .related('channels', (q) => q.orderBy('createdAt', 'asc'))
    )[0][0]?.channels || []
  )
}

export const useCurrentChannel = () => {
  const [userState, { activeChannel }] = useUserState()
  return useQuery((q) =>
    q.server
      .where('id', userState?.activeServer || '')
      .orderBy('createdAt', 'desc')
      .related('channels', (q) => q.where('id', activeChannel || ''))
  )[0][0]?.channels?.[0]
}

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
              .orderBy('createdAt', 'asc')
              // dont get threaded messages
              .where('isThreadReply', false)
              .where(({ not, exists, cmp }) =>
                activeChannelState?.mainView === 'thread'
                  ? exists('thread')
                  : cmp('isThreadReply', false)
              )
              .related('reactions')
              .related('thread')
              .related('sender')
          )
        )
    )[0][0]?.channels?.[0]?.messages || []
  )
}
