import { router } from 'one'
import { signOut } from '~/auth/client/authClient'
import { showToast } from '~/interface/ui/toast/Toast'

export function useLogout() {
  const logout = async () => {
    try {
      const result = await signOut()
      if (result.error) throw new Error(result.error.message ?? 'Sign-out failed')
      await router.replace('/auth/login')
      return true
    } catch (error) {
      showToast('Could not log out', {
        type: 'error',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
      return false
    }
  }

  return { logout }
}
