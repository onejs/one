import { useAuth } from '~/better-auth/authClient'
import { useQuery } from '../zero/zero'

// this isnt the ultimate organization probably
// waiting until this gets bigger and finding patterns
// for now just throwing a lot of useQuery into here

export const useServersQuery = () => useQuery((q) => q.server)[0]

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
