import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { useEffect } from 'react'
import { setAuthToken } from './authClient'
import { useAuth } from './useAuth'
import { setZeroAuth } from '../zero/zero'

export const AuthEffects = () => {
  useAuthPassTokenToTauriEffect()
  useAuthPassJWTSecretToZeroEffect()

  return null
}

const useAuthPassJWTSecretToZeroEffect = () => {
  const { jwtToken } = useAuth()

  useEffect(() => {
    if (jwtToken) {
      setZeroAuth(jwtToken)
    }
  }, [jwtToken])
}

const useAuthPassTokenToTauriEffect = () => {
  useEffect(() => {
    try {
      onOpenUrl(([urlString]) => {
        const url = new URL(urlString)

        switch (url.host) {
          case 'finish-auth': {
            const token = url.searchParams.get('token')

            if (token) {
              setAuthToken(token)
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
