import { useEffect, useRef } from 'react'
import { View, type TamaguiElement } from 'tamagui'
import type { ListSpacerProps } from './virtualListContract'

// on web the list may not own its scrolling (a page whose document scrolls), so
// scroll offsets say nothing about where the reader is. an intersection
// observer on the spacer does: it reports the spacer once it comes within two
// viewports of what is visible, through any scroll ancestor. the reach is the
// spacer's whole extent up to two viewports past the visible edge, taken from
// the entry's box, so a reader who jumped deep into the spacer gets every row
// up to where they landed in one page. observing again after every height
// change reports the spacer that is still in reach after a page mounted, and a
// zero-height spacer after the last row still intersects. the spacer never
// serves as the scroll anchor: a reader scrolled into it would see it pinned in
// place while rows mount beside it, so it would stay in reach until every row
// mounted.
export function ListSpacer({ height, side, onReach }: ListSpacerProps) {
  const ref = useRef<TamaguiElement>(null)
  const onReachRef = useRef(onReach)
  useEffect(() => {
    onReachRef.current = onReach
  })
  useEffect(() => {
    const node = ref.current
    if (!(node instanceof Element)) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        const box = entry.boundingClientRect
        const reach =
          side === 'after' ? innerHeight * 3 - box.top : box.bottom + innerHeight * 2
        onReachRef.current(Math.min(box.height, Math.max(0, reach)))
      },
      { rootMargin: '200% 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [height, side])
  return <View ref={ref} height={height} style={{ overflowAnchor: 'none' }} />
}
