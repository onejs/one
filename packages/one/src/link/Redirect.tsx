import { useRef } from 'react'
import { useRouter } from '../hooks'
import type { OneRouter } from '../interfaces/router'
import { useFocusEffect } from '../useFocusEffect'

/** Redirects to the href as soon as the component is mounted. */

export function Redirect({ href }: { href: OneRouter.Href }) {
  const router = useRouter()
  const hasRedirected = useRef(false)

  useFocusEffect(() => {
    if (hasRedirected.current) return
    hasRedirected.current = true
    try {
      router.replace(href)
    } catch (error) {
      console.error(error)
    }
  }, [href])

  return null
}
