import { router } from 'one'
import { signOut } from '~/auth/client/authClient'

export function useLogout() {
  const logout = async () => {
    await signOut()
    router.replace('/auth/login')
  }

  return { logout }
}
