import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { useEffect } from 'react'
import { isTauri } from '~/tauri/constants'
import { setZeroAuth } from '../zero/zero'
import { setAuth } from './authClient'
import { useAuth } from './useAuth'

export const AuthEffects = () => {
  useAuthPassTokenToTauriEffect()
  useAuthPassJWTSecretToZeroEffect()

  return null
}

const useAuthPassJWTSecretToZeroEffect = () => {
  const { jwtToken, user } = useAuth()

  useEffect(() => {
    if (user && jwtToken) {
      setZeroAuth({
        jwtToken,
        userID: user.id,
      })
    }
  }, [user, jwtToken])
}

const useAuthPassTokenToTauriEffect = () => {
  if (!isTauri) return

  useEffect(() => {
    try {
      onOpenUrl(([urlString]) => {
        const url = new URL(urlString)

        switch (url.host) {
          case 'finish-auth': {
            const token = url.searchParams.get('token')
            const session = url.searchParams.get('session')

            if (token && session) {
              setAuth({
                token,
                session,
              })
            }

            break
          }
        }
      })
    } catch (err) {
      console.error(err)
    }
  }, [])
}
