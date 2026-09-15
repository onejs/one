import { useRouter } from 'one'
import { useEffect } from 'react'

export default function NativeSplitViewScreen() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/profile')
  }, [router])

  return null
}
