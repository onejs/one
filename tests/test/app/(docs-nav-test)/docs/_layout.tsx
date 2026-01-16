import { useEffect, useRef, useState } from 'react'
import { Link, Slot, type Href } from 'one'

/**
 * Docs layout for navigation stability test.
 *
 * Bug scenario:
 * 1. User is on homepage /
 * 2. User clicks Link to /docs/page-1 - layout mounts, sidebar animates (expected)
 * 3. User clicks Link to /docs/page-2 - layout REMOUNTS! sidebar animates AGAIN (BUG!)
 * 4. User clicks Link to /docs/page-3 - no remount (stable now)
 *
 * This layout tracks mount/unmount to catch the bug.
 */
export default function DocsNavTestLayout() {
  const mountCountRef = useRef(0)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    mountCountRef.current += 1
    setIsMounted(true)

    // Expose mount tracking globally for tests
    if (typeof window !== 'undefined') {
      const w = window as any
      w.__docsLayoutMountCount = (w.__docsLayoutMountCount || 0) + 1
      w.__docsLayoutLastMountTime = Date.now()
      w.__docsLayoutMountHistory = w.__docsLayoutMountHistory || []
      w.__docsLayoutMountHistory.push({
        time: Date.now(),
        path: window.location.pathname,
        type: 'mount',
      })
      console.log('[DocsNavTestLayout] MOUNTED', {
        mountCount: w.__docsLayoutMountCount,
        path: window.location.pathname,
      })
    }

    return () => {
      if (typeof window !== 'undefined') {
        const w = window as any
        w.__docsLayoutUnmountCount = (w.__docsLayoutUnmountCount || 0) + 1
        w.__docsLayoutLastUnmountTime = Date.now()
        w.__docsLayoutMountHistory = w.__docsLayoutMountHistory || []
        w.__docsLayoutMountHistory.push({
          time: Date.now(),
          path: window.location.pathname,
          type: 'unmount',
        })
        console.log('[DocsNavTestLayout] UNMOUNTED', {
          unmountCount: w.__docsLayoutUnmountCount,
          path: window.location.pathname,
        })
      }
    }
  }, [])

  return (
    <div id="docs-nav-test-layout" data-mount-count={mountCountRef.current}>
      <aside
        id="docs-nav-test-sidebar"
        className={isMounted ? 'sidebar-mounted' : 'sidebar-mounting'}
        style={{
          width: 200,
          padding: 16,
          borderRight: '1px solid #ccc',
          // In real app this would have animation on mount
        }}
      >
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>
              <Link href={'/docs/page-1' as Href}>Page 1</Link>
            </li>
            <li>
              <Link href={'/docs/page-2' as Href}>Page 2</Link>
            </li>
            <li>
              <Link href={'/docs/page-3' as Href}>Page 3</Link>
            </li>
          </ul>
        </nav>
      </aside>
      <main id="docs-nav-test-content" style={{ flex: 1, padding: 16 }}>
        <Slot />
      </main>
    </div>
  )
}
