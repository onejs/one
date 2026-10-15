import { useRouterState } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

// the original site only shows progress when navigation exceeds one second
export function NavigationProgress() {
  const loading = useRouterState({ select: (state) => state.isLoading })
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!loading) { setVisible(false); return }
    const timer = setTimeout(() => setVisible(true), 1000)
    return () => clearTimeout(timer)
  }, [loading])
  return visible ? <div role="progressbar" aria-label="Loading" style={{position:'fixed',top:0,left:0,height:3,width:'80%',background:'var(--color12)',zIndex:2147483647}} /> : null
}
