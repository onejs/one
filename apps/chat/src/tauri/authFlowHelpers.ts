import { useAuth } from '~/better-auth/authClient'

const key = 'CHAT_CAME_FROM_TAURI'

export const useTauriAuthDeepLink = () => {
  const { session, token } = useAuth()
  return `one-chat://finish-auth?session=${session?.token || ''}&token=${token}`
}

export const setShouldRedirectBackToTauri = (should = true) => {
  if (should) {
    localStorage.setItem(key, `${Date.now()}`)
  } else {
    localStorage.removeItem(key)
  }
}

export const shouldRedirectBackToTauri = () => {
  const val = localStorage.getItem(key)
  // if we started redirected tauri login within last 10 minutes
  if (val && Date.now() - +val < 10_000 * 60) {
    return true
  }
  return false
}
