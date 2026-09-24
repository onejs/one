import React, { startTransition, useEffect } from 'react'
import { usePathname, useRouter } from 'one'
import { allNativeNotPending } from './nativeRoutes'

export const useNativeMenu = () => {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const router = useRouter()
  let currentPath = pathname
  let documentVersion = ''

  const documentVersionPath = documentVersion ? `/${documentVersion}` : ''
  const currentPageIndex = allNativeNotPending.findIndex(
    (page) => page.route === currentPath
  )
  const previous = allNativeNotPending[currentPageIndex - 1]
  let nextIndex = currentPageIndex + 1
  let next = allNativeNotPending[nextIndex]
  while (next && next.route.startsWith('http')) {
    next = allNativeNotPending[++nextIndex]
  }

  // on route change close menu
  useEffect(() => {
    return router.subscribe(() => {
      startTransition(() => {
        setOpen(false)
      })
    })
  }, [])

  return {
    open,
    setOpen,
    currentPath,
    next,
    previous,
    documentVersionPath,
  }
}
