import { memo } from 'react'
import { View } from 'tamagui'
import type { VirtualRowProps } from './virtualListContract'

// the web row: the browser skips style, layout, and paint for a row outside
// the viewport, and `auto` keeps the size it last rendered at so the scroll
// height holds steady. the estimate only sizes rows never rendered.
export const VirtualRow = memo(function VirtualRow({
  children,
  estimatedHeight,
  nativeID,
}: VirtualRowProps) {
  return (
    <View
      id={nativeID}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: `auto ${estimatedHeight}px`,
      }}
    >
      {children}
    </View>
  )
})
