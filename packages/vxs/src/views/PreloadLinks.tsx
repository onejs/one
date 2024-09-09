import { useEffect } from 'react'
import { preloadRoute } from '../router/router'

export function PreloadLinks() {
  useEffect(() => {
    document.addEventListener('mouseover', (e) => {
      let target = e.target
      if (!(target instanceof HTMLElement)) return
      target = target instanceof HTMLAnchorElement ? target : target.parentElement
      if (!(target instanceof HTMLAnchorElement)) return
      const href = target.getAttribute('href')
      if (href?.[0] === '/') {
        // local route
        preloadRoute(href)
      }
    })
  }, [])

  return null
}
