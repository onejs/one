import { useSession } from '~/auth/client/authClient'
import { userById } from '~/data/userPublic/queries'
import { useQuery, zero } from '~/data/zero-client'
import type { UserPublic } from '~/types'

export function useUser() {
  const { data: session } = useSession()
  const userId = session?.user?.id ?? ''
  const [user] = useQuery(userById, { userId }, { enabled: !!userId })

  const update = (values: Partial<Pick<UserPublic, 'name' | 'username' | 'image'>>) => {
    if (!userId) throw new Error('not signed in')
    return zero.mutate.userPublic.upsert({ id: userId, joinedAt: Date.now(), ...values })
  }

  return {
    authUser: session?.user,
    user,
    update,
  }
}
