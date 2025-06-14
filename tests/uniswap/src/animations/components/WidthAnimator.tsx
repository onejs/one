import { useState } from 'react'
import { View } from 'tamagui'

export const WidthAnimator = View.styleable<{ open?: boolean; height: number }>((props, ref) => {
  const { open = true, height, children, ...rest } = props
  const [visibleWidth, setVisibleWidth] = useState(0)

  return (
    // TODO: figure out how to allow dynamic height based on content
    <View
      ref={ref}
      animation="fast"
      enterStyle={{ opacity: 0 }}
      exitStyle={{ opacity: 0 }}
      height={height}
      overflow="hidden"
      width={open ? visibleWidth : 0}
      {...rest}
    >
      <View
        position="absolute"
        onLayout={({ nativeEvent }) => {
          if (nativeEvent.layout.width) {
            setVisibleWidth(nativeEvent.layout.width)
          }
        }}
      >
        {children}
      </View>
    </View>
  )
})
