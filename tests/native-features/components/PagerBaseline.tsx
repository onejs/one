import { forwardRef } from 'react'
import { One, type PagerProps, type PagerRef } from 'one'

// the rival is native-only; the web fixture keeps the same control surface.
export default forwardRef<
  PagerRef,
  PagerProps & { onScrollCost?: (cost: number) => void }
>(function PagerBaseline({ onScrollCost, onPageScroll, ...props }, ref) {
  return (
    <One.UI.Pager
      {...props}
      ref={ref}
      onPageScroll={(event) => {
        const start = performance.now()
        onPageScroll?.(event)
        onScrollCost?.(performance.now() - start)
      }}
    />
  )
})
