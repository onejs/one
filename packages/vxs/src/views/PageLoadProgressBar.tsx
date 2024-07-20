import { useEffect, useState } from 'react'
import { View, type ViewProps } from 'react-native'
import { router } from '../imperative-api'

export type PageLoadProgressBarProps = {
  startDelay?: number
  finishDelay?: number
  initialPercent?: number
  updateInterval?: number
  sporadicness?: number
} & Pick<ViewProps, 'style' | 'onLayout' | 'children'>

export const PageLoadProgressBar = ({
  startDelay = 500,
  finishDelay = 50,
  initialPercent = 20,
  updateInterval = 300,
  sporadicness = 3,
  ...props
}: PageLoadProgressBarProps) => {
  const [loaded, setLoaded] = useState(0) // 0 to 100
  const [width, setWidth] = useState(0)

  useEffect(() => {
    let loadInterval

    const dispose = router.onLoadState((state) => {
      clearTimeout(loadInterval)

      switch (state) {
        case 'loading': {
          loadInterval = setTimeout(() => {
            setLoaded(initialPercent)

            // to make it feel more realistic, we skip every N updates
            let intervalCount = 0

            loadInterval = setInterval(() => {
              intervalCount++

              if (intervalCount % sporadicness === 0) {
                return
              }

              setLoaded((prev) => {
                const increment = (100 - prev) * (prev > 80 ? 0.05 : 0.1) * Math.random()
                return Math.min(prev + increment, 100)
              })
            }, updateInterval)
          }, startDelay)
          break
        }

        case 'loaded': {
          setLoaded(100)
          clearInterval(loadInterval)
          setTimeout(() => {
            setLoaded(0)
          }, finishDelay)
          break
        }
      }
    })

    return () => {
      dispose()
      clearInterval(loadInterval)
    }
  }, [finishDelay, initialPercent, sporadicness, startDelay, updateInterval])

  return (
    <View
      {...props}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width)
        props.onLayout?.(e)
      }}
      style={[
        {
          display: loaded === 0 ? 'none' : 'flex',
          height: 1,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(60, 100, 200, 0.65)',
          width: '100%',
          transform: [{ translateX: -(1 - loaded * 0.01) * width }],
          zIndex: Number.MAX_SAFE_INTEGER,
        },
        props.style,
      ]}
    />
  )
}
