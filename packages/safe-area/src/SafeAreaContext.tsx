import * as React from 'react'
import { Dimensions, StyleSheet, type ViewProps } from 'react-native'
import { NativeSafeAreaProvider } from './NativeSafeAreaProvider'
import type { EdgeInsets, InsetChangedEvent, Metrics, Rect } from './SafeArea-types'

const isDev = process.env.NODE_ENV !== 'production'

export const SafeAreaInsetsContext = React.createContext<EdgeInsets | null>(null)
if (isDev) {
  SafeAreaInsetsContext.displayName = 'SafeAreaInsetsContext'
}

export const SafeAreaFrameContext = React.createContext<Rect | null>(null)
if (isDev) {
  SafeAreaFrameContext.displayName = 'SafeAreaFrameContext'
}

export interface SafeAreaProviderProps {
  children?: React.ReactNode
  initialMetrics?: Metrics | null
  /**
   * @deprecated
   */
  initialSafeAreaInsets?: EdgeInsets | null
}

export function SafeAreaProvider({
  children,
  initialMetrics,
  initialSafeAreaInsets,
  ...others
}: SafeAreaProviderProps) {
  const parentInsets = useParentSafeAreaInsets()
  const parentFrame = useParentSafeAreaFrame()
  const [insets, setInsets] = React.useState<EdgeInsets | null>(
    initialMetrics?.insets ?? initialSafeAreaInsets ?? parentInsets ?? null
  )
  const [frame, setFrame] = React.useState<Rect>(
    initialMetrics?.frame ??
      parentFrame ?? {
        // Backwards compat so we render anyway if we don't have frame.
        x: 0,
        y: 0,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
      }
  )
  const onInsetsChange = React.useCallback((event: InsetChangedEvent) => {
    const {
      nativeEvent: { frame: nextFrame, insets: nextInsets },
    } = event

    React.startTransition(() => {
      setFrame((curFrame) => {
        if (
          // Backwards compat with old native code that won't send frame.
          nextFrame &&
          (nextFrame.height !== curFrame.height ||
            nextFrame.width !== curFrame.width ||
            nextFrame.x !== curFrame.x ||
            nextFrame.y !== curFrame.y)
        ) {
          return nextFrame
        }
        return curFrame
      })

      setInsets((curInsets) => {
        if (
          !curInsets ||
          nextInsets.bottom !== curInsets.bottom ||
          nextInsets.left !== curInsets.left ||
          nextInsets.right !== curInsets.right ||
          nextInsets.top !== curInsets.top
        ) {
          return nextInsets
        }
        return curInsets
      })
    })
  }, [])

  return (
    <NativeSafeAreaProvider onInsetsChange={onInsetsChange} {...others}>
      <SafeAreaFrameContext.Provider value={frame}>
        <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>
      </SafeAreaFrameContext.Provider>
    </NativeSafeAreaProvider>
  )
}

function useParentSafeAreaInsets(): EdgeInsets | null {
  return React.useContext(SafeAreaInsetsContext)
}

function useParentSafeAreaFrame(): Rect | null {
  return React.useContext(SafeAreaFrameContext)
}

const NO_INSETS_ERROR =
  'No safe area value available. Make sure you are rendering `<SafeAreaProvider>` at the top of your app.'

export function useSafeAreaInsets(): EdgeInsets {
  const insets = React.useContext(SafeAreaInsetsContext)
  if (insets == null) {
    throw new Error(NO_INSETS_ERROR)
  }
  return insets
}

export function useSafeAreaFrame(): Rect {
  const frame = React.useContext(SafeAreaFrameContext)
  if (frame == null) {
    throw new Error(NO_INSETS_ERROR)
  }
  return frame
}

export type WithSafeAreaInsetsProps = {
  insets: EdgeInsets
}

export function withSafeAreaInsets<T>(
  WrappedComponent: React.ComponentType<T & WithSafeAreaInsetsProps>
): React.ForwardRefExoticComponent<React.PropsWithoutRef<T> & React.RefAttributes<unknown>> {
  return React.forwardRef((props: T, ref: React.Ref<unknown>) => {
    const insets = useSafeAreaInsets()
    return <WrappedComponent {...props} insets={insets} ref={ref} />
  })
}

/**
 * @deprecated
 */
export function useSafeArea(): EdgeInsets {
  return useSafeAreaInsets()
}

/**
 * @deprecated
 */
export const SafeAreaConsumer = SafeAreaInsetsContext.Consumer

/**
 * @deprecated
 */
export const SafeAreaContext = SafeAreaInsetsContext
