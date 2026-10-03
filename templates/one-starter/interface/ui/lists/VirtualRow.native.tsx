import { memo, useCallback, useState } from 'react'
import { unstable_VirtualView as VirtualView, View } from 'react-native'
import Animated from 'react-native-reanimated'
import type { VirtualRowProps } from './virtualListContract'
import type { LayoutChangeEvent } from 'react-native'

// a scroll-container row that native VirtualView empties once it leaves the
// container's prerender window. VirtualView drops its children while hidden, so
// the row keeps its last measured height: a reveal then keeps the content size
// it had before the hide instead of collapsing for the frame before its
// children lay out again.
export const VirtualRow = memo(function VirtualRow({
  children,
  nativeID,
  motion,
}: VirtualRowProps) {
  const [measuredHeight, setMeasuredHeight] = useState<number>()
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height
    setMeasuredHeight((current) => (current === height ? current : height))
  }, [])
  const hiddenStyle = useCallback(
    (targetRect: { height: number }) => ({ height: measuredHeight ?? targetRect.height }),
    [measuredHeight],
  )

  const row = (
    <VirtualView
      hiddenStyle={hiddenStyle}
      nativeID={nativeID}
      removeClippedSubviews
      style={measuredHeight === undefined ? null : { minHeight: measuredHeight }}
    >
      <View onLayout={handleLayout}>{children}</View>
    </VirtualView>
  )
  // the entrance runs on its own view inside the one that glides, so a row
  // laid out again while it enters keeps both its rise and its glide
  return motion === undefined ? (
    row
  ) : (
    <Animated.View layout={motion.layout}>
      <Animated.View entering={motion.entering}>{row}</Animated.View>
    </Animated.View>
  )
})
