import * as React from 'react'
import type { ViewProps } from 'react-native'
import { router } from '../router/imperative-api'

export type LoadProgressBarProps = {
  /** How long after a navigation to wait before showing the progress bar (in ms) */
  startDelay?: number
  /** How long after a navigation completes to wait before hiding the progress bar (in ms) */
  finishDelay?: number
  /** The starting percent it should show the loading state at */
  initialPercent?: number
  /** How often the progress bar should update (in ms) */
  updateInterval?: number
  /** How often to skip an update (checked each during the loop) */
  sporadicness?: number
  /** Pass style to the inner View */
  style?: ViewProps['style']
  /** Pass onLayout to the inner View */
  onLayout?: ViewProps['onLayout']
  /** Pass children to the inner View */
  children?: ViewProps['children']
}

export const LoadProgressBar = ({
  startDelay = 500,
  finishDelay = 50,
  initialPercent = 20,
  updateInterval = 300,
  sporadicness = 3,
  style,
  onLayout,
  ...props
}: LoadProgressBarProps) => {
  const [loaded, setLoaded] = React.useState(0)
  const [width, setWidth] = React.useState(0)
  const elementRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    let loadInterval: ReturnType<typeof setTimeout>

    const dispose = router.onLoadState((state) => {
      clearTimeout(loadInterval)

      switch (state) {
        case 'loading': {
          loadInterval = setTimeout(() => {
            setLoaded(initialPercent)
            let intervalCount = 0

            loadInterval = setInterval(() => {
              intervalCount++
              if (intervalCount % sporadicness === 0) {
                return
              }

              setLoaded((previous) => {
                const increment =
                  (100 - previous) * (previous > 80 ? 0.05 : 0.1) * Math.random()
                return Math.min(previous + increment, 100)
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

  React.useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const updateLayout = () => {
      const rect = element.getBoundingClientRect()
      setWidth(rect.width)
      onLayout?.({
        nativeEvent: {
          layout: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        },
      } as Parameters<NonNullable<ViewProps['onLayout']>>[0])
    }

    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(element)
    return () => observer.disconnect()
  }, [onLayout])

  const flattenedStyle = React.useMemo<React.CSSProperties>(() => {
    const styleValue: unknown = style
    const styleValues: unknown[] = Array.isArray(styleValue)
      ? styleValue.flat(Number.POSITIVE_INFINITY)
      : [styleValue]
    return styleValues.reduce<React.CSSProperties>(
      (result, value) =>
        value && typeof value === 'object'
          ? Object.assign(result, value as React.CSSProperties)
          : result,
      {}
    )
  }, [style])

  return (
    <div
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
      ref={elementRef}
      style={{
        display: loaded === 0 ? 'none' : 'flex',
        height: 1,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(60, 100, 200, 0.65)',
        width: '100%',
        transform: `translateX(${-(1 - loaded * 0.01) * width}px)`,
        zIndex: Number.MAX_SAFE_INTEGER,
        ...flattenedStyle,
      }}
    />
  )
}
