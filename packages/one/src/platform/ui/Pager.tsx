import {
  Children,
  isValidElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { StyleSheet } from 'react-native'
import { validatePage, validatePager, type PagerProps, type PagerRef } from './pagerTypes'

function event<T>(nativeEvent: T): { nativeEvent: T } {
  return { nativeEvent }
}

export const Pager = forwardRef<PagerRef, PagerProps>(function Pager(
  {
    children,
    initialPage = 0,
    scrollEnabled = true,
    orientation = 'horizontal',
    layoutDirection = 'ltr',
    pageMargin = 0,
    onPageScroll,
    onPageSelected,
    onPageScrollStateChanged,
    keyboardDismissMode = 'none',
    style,
    testID,
    ...props
  },
  ref
) {
  validatePager({
    ...props,
    initialPage,
    orientation,
    layoutDirection,
    pageMargin,
    keyboardDismissMode,
  })
  const container = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onPageScroll, onPageSelected, onPageScrollStateChanged })
  callbacks.current = { onPageScroll, onPageSelected, onPageScrollStateChanged }
  const pointer = useRef<{ x: number; y: number; offset: number } | null>(null)
  const selected = useRef(initialPage)
  const initialized = useRef(false)
  const state = useRef('idle')
  const [enabled, setEnabled] = useState(scrollEnabled)
  const vertical = orientation === 'vertical'
  const count = Children.count(children)
  const dimensions = useRef({
    vertical,
    rtl: layoutDirection === 'rtl',
    pageMargin,
    count,
  })
  dimensions.current = { vertical, rtl: layoutDirection === 'rtl', pageMargin, count }
  function setState(next: 'idle' | 'dragging' | 'settling') {
    if (state.current === next) return
    state.current = next
    callbacks.current.onPageScrollStateChanged?.(event({ pageScrollState: next }))
  }
  function scroll() {
    const node = container.current
    if (!node || !count) return
    const stride = (vertical ? node.clientHeight : node.clientWidth) + pageMargin
    if (!stride) return
    const value = Math.max(
      0,
      Math.min(
        count - 1,
        (vertical ? node.scrollTop : Math.abs(node.scrollLeft)) / stride
      )
    )
    callbacks.current.onPageScroll?.(
      event({ position: Math.floor(value), offset: value - Math.floor(value) })
    )
  }
  function settle() {
    const node = container.current
    if (!node || !count) return
    const stride = (vertical ? node.clientHeight : node.clientWidth) + pageMargin
    if (!stride) return
    const page = Math.max(
      0,
      Math.min(
        count - 1,
        Math.round((vertical ? node.scrollTop : Math.abs(node.scrollLeft)) / stride)
      )
    )
    if (page !== selected.current || !initialized.current) {
      selected.current = page
      callbacks.current.onPageSelected?.(event({ position: page }))
    }
    initialized.current = true
    callbacks.current.onPageScroll?.(event({ position: page, offset: 0 }))
    setState('idle')
  }
  function goTo(index: number, animated: boolean) {
    validatePage(index)
    const node = container.current
    const d = dimensions.current
    if (!node || index >= d.count) return
    const offset =
      index * ((d.vertical ? node.clientHeight : node.clientWidth) + d.pageMargin)
    if (animated && index !== selected.current) setState('settling')
    node.scrollTo({
      left: d.vertical ? 0 : offset * (d.rtl ? -1 : 1),
      top: d.vertical ? offset : 0,
      behavior: animated ? 'smooth' : 'instant',
    })
    if (!animated) settle()
  }
  useImperativeHandle(ref, () => ({
    // Reanimated's createAnimatedComponent animates this element instead of the handle
    getAnimatableRef: () => container.current,
    setPage: (index) => goTo(index, true),
    setPageWithoutAnimation: (index) => goTo(index, false),
    setScrollEnabled: setEnabled,
  }))
  useEffect(() => setEnabled(scrollEnabled), [scrollEnabled])
  useLayoutEffect(() => {
    const node = container.current
    if (!node) return
    const resize = new ResizeObserver(() =>
      goTo(Math.min(selected.current, Math.max(0, count - 1)), false)
    )
    resize.observe(node)
    goTo(Math.min(selected.current, Math.max(0, count - 1)), false)
    node.addEventListener('scrollend', settle)
    return () => {
      resize.disconnect()
      node.removeEventListener('scrollend', settle)
    }
  }, [count, orientation, layoutDirection, pageMargin])
  const flattened = StyleSheet.flatten(style) as CSSProperties
  const css: CSSProperties = {
    ...flattened,
    display: 'flex',
    position: 'relative',
    flexDirection: vertical ? 'column' : 'row',
    direction: layoutDirection,
    overflowX: enabled && !vertical ? 'auto' : 'hidden',
    overflowY: enabled && vertical ? 'auto' : 'hidden',
    scrollSnapType: `${vertical ? 'y' : 'x'} mandatory`,
    gap: pageMargin,
    scrollbarWidth: 'none',
    overscrollBehavior: 'contain',
  }
  return (
    <div
      ref={container}
      style={css}
      data-testid={testID}
      onScroll={scroll}
      onPointerDown={(e) => {
        const node = container.current
        if (!enabled || !node) return
        pointer.current = {
          x: e.clientX,
          y: e.clientY,
          offset: vertical ? node.scrollTop : node.scrollLeft,
        }
      }}
      onPointerMove={(e) => {
        const start = pointer.current
        if (!start || !enabled || state.current === 'dragging') return
        const distance = vertical
          ? Math.abs(e.clientY - start.y)
          : Math.abs(e.clientX - start.x)
        if (distance < 8) return
        setState('dragging')
        if (
          keyboardDismissMode === 'on-drag' &&
          document.activeElement instanceof HTMLElement
        )
          document.activeElement.blur()
      }}
      onPointerUp={() => {
        const start = pointer.current
        const node = container.current
        pointer.current = null
        if (state.current !== 'dragging' || !node) return
        if ((vertical ? node.scrollTop : node.scrollLeft) === start?.offset) settle()
        else setState('settling')
      }}
      onPointerCancel={() => {
        pointer.current = null
        if (state.current === 'dragging') setState('settling')
      }}
      onWheel={() => {
        if (enabled) setState('dragging')
      }}
    >
      {Children.map(children, (child, index) => {
        if (!isValidElement(child))
          throw new Error('Pager children must be React Native views')
        return (
          <div
            key={index}
            style={{
              flex: '0 0 100%',
              display: 'flex',
              flexDirection: 'column',
              width: vertical ? '100%' : undefined,
              height: vertical ? undefined : '100%',
              scrollSnapAlign: 'start',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
})
export type {
  PagerProps,
  PagerRef,
  PagerScrollEvent,
  PagerSelectedEvent,
  PagerScrollStateEvent,
} from './pagerTypes'
