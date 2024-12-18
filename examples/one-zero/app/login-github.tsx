import { Home } from '@tamagui/lucide-icons'
import { useEffect } from 'react'
import { githubSignIn } from '~/src/better-auth/githubSignIn'

export default function () {
  useEffect(() => {
    githubSignIn()
  }, [])

  return <Home />
}
