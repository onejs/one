import { useState } from 'react'
import { View } from 'tamagui'

export const HeightAnimator = View.styleable<{ open?: boolean }>((props, ref) => {
  const { open = true, children, ...rest } = props
  const [visibleHeight, setVisibleHeight] = useState(0)

  return (
    <View
      ref={ref}
      animation="fast"
      enterStyle={{ opacity: 0 }}
      exitStyle={{ opacity: 0 }}
      height={open ? visibleHeight : 0}
      overflow="hidden"
      width="100%"
      {...rest}
    >
      <View
        position="absolute"
        width="100%"
        onLayout={({ nativeEvent }) => {
          if (nativeEvent.layout.height) {
            setVisibleHeight(nativeEvent.layout.height)
          }
        }}
      >
        {children}
      </View>
    </View>
  )
})
