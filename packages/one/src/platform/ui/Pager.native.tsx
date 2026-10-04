import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useImperativeHandle,
  useRef,
} from 'react'
import type { ViewProps } from 'react-native'
import NativePager, { Commands } from '../specs/OneNativePagerNativeComponent'
import { validatePage, validatePager, type PagerProps, type PagerRef } from './pagerTypes'

export const Pager = forwardRef<PagerRef, PagerProps>(function Pager(
  { children, onPageScrollStateChanged, ...props },
  ref
) {
  validatePager(props)
  const nativeRef = useRef<React.ElementRef<typeof NativePager>>(null)
  useImperativeHandle(
    ref,
    () => ({
      // Reanimated's createAnimatedComponent resolves the host view through this,
      // so worklet event handlers and animated props attach to the native pager
      getAnimatableRef: () => nativeRef.current,
      setPage(index) {
        validatePage(index)
        if (nativeRef.current) Commands.setPage(nativeRef.current, index)
      },
      setPageWithoutAnimation(index) {
        validatePage(index)
        if (nativeRef.current) Commands.setPageWithoutAnimation(nativeRef.current, index)
      },
      setScrollEnabled(enabled) {
        if (nativeRef.current)
          Commands.setScrollEnabledImperatively(nativeRef.current, enabled)
      },
    }),
    []
  )
  return (
    <NativePager
      {...props}
      ref={nativeRef}
      onPageScrollStateChanged={
        onPageScrollStateChanged
          ? ({ nativeEvent }) => {
              const state = nativeEvent.pageScrollState
              if (state === 'idle' || state === 'dragging' || state === 'settling')
                onPageScrollStateChanged({ nativeEvent: { pageScrollState: state } })
            }
          : undefined
      }
    >
      {Children.map(children, (child) => {
        if (!isValidElement<ViewProps>(child))
          throw new Error('Pager children must be React Native views')
        return cloneElement(child, {
          collapsable: false,
          style: [
            child.props.style,
            { position: 'absolute', width: '100%', height: '100%' },
          ],
        })
      })}
    </NativePager>
  )
})
export type {
  PagerProps,
  PagerRef,
  PagerScrollEvent,
  PagerSelectedEvent,
  PagerScrollStateEvent,
} from './pagerTypes'
