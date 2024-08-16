import { useRouter } from '../hooks'
import type { VXSRouter } from '../interfaces/router'
import { useFocusEffect } from '../useFocusEffect'

/** Redirects to the href as soon as the component is mounted. */
export function Redirect({ href }: { href: VXSRouter.Href }) {
  const router = useRouter()
  useFocusEffect(() => {
    try {
      router.replace(href)
    } catch (error) {
      console.error(error)
    }
  })
  return null
}
