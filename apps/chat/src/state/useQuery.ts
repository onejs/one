import { useAuth } from '~/better-auth/authClient'
import { useQuery } from '../zero/zero'
import { useUserState } from './user'

// this isnt the ultimate organization probably
// waiting until this gets bigger and finding patterns
// for now just throwing a lot of useQuery into here

export const useServersQuery = () => useQuery((q) => q.server)[0]

export const useCurrentServerRoles = () => {
  const [userState] = useUserState()
  return useQuery((q) =>
    q.server
      .where('id', userState?.activeServer || '')
      .related('roles', (r) => r.related('members'))
  )[0][0]?.roles
}

export const useCurrentServerMembers = () => {
  const [userState] = useUserState()
  return (
    useQuery((q) => q.server.where('id', userState?.activeServer || '').related('members'))[0][0]
      ?.members || []
  )
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
