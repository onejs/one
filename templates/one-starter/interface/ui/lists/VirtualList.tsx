import { useWindowDimensions } from '@tamagui/use-window-dimensions'
import {
  startTransition,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { LayoutAnimationConfig } from 'react-native-reanimated'
import { ScrollView, View } from 'tamagui'
import { ListSpacer } from './ListSpacer'
import { VirtualRow } from './VirtualRow'
import type { RowMotion } from './virtualListContract'
import type { ReactNode, RefObject } from 'react'
import type {
  Insets,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
} from 'react-native'

export { VirtualRow } from './VirtualRow'

// a long or unbounded list. rows are direct children of one scroll view; each
// is a VirtualRow, which native VirtualView empties outside the container's
// prerender window and the browser skips with content-visibility. neither
// stops react from building every row, and mapping thousands of rows in one
// pass is what freezes a long list at startup, so only a window of rows near
// the anchored end mounts. one spacer sized from the estimate stands in for
// the rest, and scrolling toward it mounts another page.
//
// anchor 'start' is a feed read top down. anchor 'end' is a chat or log read
// from the newest row: it opens at the end, follows the end while the reader is
// there, and keeps the visible rows still when rows mount above them.
export type VirtualListHandle = {
  scrollToEnd: (options?: { animated?: boolean; viewOffset?: number }) => void
  // an end-anchored list is following its tail while the reader sits near the
  // end or a tail scroll is still carrying them there
  isFollowingTail: () => boolean
}

export type VirtualListScrollRef = {
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void
  scrollToEnd: (options?: { animated?: boolean }) => void
}

// a page is the rows that fill the viewport plus this many beyond it.
const WINDOW_ROWS_BEYOND_VIEWPORT = 4
// mount this many viewports of rows per expansion, starting once the reader is
// this many viewports from the spacer.
const EXPAND_VIEWPORTS = 2
// ask for more content once the reader is this fraction of a viewport from the
// loaded edge.
const EDGE_REACHED_VIEWPORT_FRACTION = 0.2
const NEAR_END_PX = 80
// a tail scroll has arrived only at the end itself: the band short of it that
// still counts as following is offsets the scroll passes through
const TAIL_SCROLL_ARRIVED_PX = 1
// end-aligned content shorter than its viewport sits below a filler that takes
// the free space. the filler is the first view anchoring finds while it has
// height, and its top never moves, so a viewport or inset change resizes it
// without shifting the offset. a row as the anchor would move with that change
// and anchoring would scroll by it to a negative offset. once content overflows
// the filler is empty and anchoring falls through to the rows.
const END_ALIGNED_FILLER_STYLE = { flexGrow: 1 } as const
// native prepend anchoring: growing an end-anchored window moves content out of
// the spacer into real rows above the reader, which is a prepend. the browser
// anchors the same way on its own.
const MAINTAIN_VISIBLE_CONTENT_POSITION = { minIndexForVisible: 0 } as const

export function VirtualList<TItem>({
  items,
  keyExtractor,
  renderItem,
  estimatedItemHeight,
  anchor = 'start',
  followTail = true,
  animateTailPinOnAppend = false,
  rowMotion,
  alignContentAtEnd = false,
  endContentInset = 0,
  pinAtEndOnLayout = false,
  header,
  footer,
  empty,
  contentContainerStyle,
  style,
  testID,
  showsVerticalScrollIndicator = false,
  contentInsetAdjustmentBehavior = 'never',
  onScroll: onScrollProp,
  onScrollBeginDrag: onScrollBeginDragProp,
  onStartReached,
  onEndReached,
  renderScroll,
  ref,
}: {
  items: readonly TItem[]
  keyExtractor: (item: TItem, index: number) => string
  renderItem: (item: TItem, index: number) => ReactNode
  estimatedItemHeight: number
  anchor?: 'start' | 'end'
  // anchor 'end' only: keep the newest row in view while the reader is at the end.
  followTail?: boolean
  // anchor 'end' only: animate the tail pin when a new row arrived at the tail
  // instead of jumping there in one frame. growth inside one row
  // (a streaming reply regrowing its last row) still pins instantly — a smooth
  // scroll can't keep pace with token-by-token growth and lags off the bottom.
  animateTailPinOnAppend?: boolean
  // alignContentAtEnd only, native: while the list is shorter than its viewport
  // a row arriving or the end inset changing moves the rows by layout, not by
  // scroll, so they move on this motion, as a collection view's batch update
  // does. the rows of the first paint never enter. a list that overflows moves
  // by scroll: moves already running finish, then its rows stop carrying the
  // motion, since growing the window there reflows rows that anchoring holds
  // in place. whether a list carries row motion is fixed when it mounts.
  rowMotion?: RowMotion
  // anchor 'end' only: a short list sits against the bottom of the viewport.
  alignContentAtEnd?: boolean
  // alignContentAtEnd only: the scroll view's own bottom inset under an
  // overlaid control (a composer), so a short list ends above it at offset zero.
  endContentInset?: number
  // anchor 'end' only: a surface whose own layout moves the end (a keyboard
  // resizing the list every frame) pins an at-end reader on each layout.
  pinAtEndOnLayout?: boolean
  header?: ReactNode
  footer?: ReactNode
  // rendered between header and footer when there are no items.
  empty?: ReactNode
  contentContainerStyle?: ScrollViewProps['contentContainerStyle']
  style?: StyleProp<ViewStyle>
  testID?: string
  showsVerticalScrollIndicator?: boolean
  contentInsetAdjustmentBehavior?: ScrollViewProps['contentInsetAdjustmentBehavior']
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  onScrollBeginDrag?: () => void
  // anchor 'end': the reader reached the oldest loaded row. fires once per
  // approach, re-armed after the reader drags away from it.
  onStartReached?: () => void
  // anchor 'start': the reader reached the last loaded row. fires once per
  // approach, re-armed after the reader scrolls away or more rows arrive.
  onEndReached?: () => void
  // swap in another scroll view (a keyboard-aware one) with the same props.
  renderScroll?: (
    props: ScrollViewProps,
    ref: RefObject<VirtualListScrollRef | null>,
    onContentInsetChange: (insets: Insets) => void,
  ) => ReactNode
  ref?: RefObject<VirtualListHandle | null>
}) {
  const atEnd = anchor === 'end'
  const scrollRef = useRef<VirtualListScrollRef | null>(null)
  // the first window is sized from the window, never the list's own layout: a
  // web list inside a page whose document scrolls is as tall as its content.
  const windowHeight = useWindowDimensions().height
  const viewportHeightRef = useRef(0)
  const [alignedViewportHeight, setAlignedViewportHeight] = useState(0)
  // every row keeps one parent chain for the list's life: a row whose wrapper
  // came or went would remount, losing its state and any entrance
  const [carriesRowMotion] = useState(rowMotion !== undefined)
  // the end-aligned filler has height: the rows are shorter than the viewport
  const [fillerOpen, setFillerOpen] = useState(false)
  const fillerOpenRef = useRef(false)
  // the list has just overflowed and its rows keep the layout motion until the
  // moves it started finish: native reanimated drops a view's config at once
  // and a move still running then keeps writing its old target over later
  // layout
  const [layoutMotionSettling, setLayoutMotionSettling] = useState(false)
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdLayoutMotion = useCallback(() => {
    if (!rowMotion) return
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    setLayoutMotionSettling(true)
    settleTimerRef.current = setTimeout(() => {
      settleTimerRef.current = null
      setLayoutMotionSettling(false)
    }, rowMotion.moveMs)
  }, [rowMotion])
  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current)
    },
    [],
  )
  // typed by what it reads: tamagui's View reports a narrower event than react
  // native's LayoutChangeEvent
  const handleFillerLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const open = event.nativeEvent.layout.height > 0
      if (fillerOpenRef.current && !open) holdLayoutMotion()
      fillerOpenRef.current = open
      setFillerOpen(open)
    },
    [holdLayoutMotion],
  )
  const [extraWindowRows, setExtraWindowRows] = useState(0)
  const followingTailRef = useRef(true)
  // an animated scroll to the end is on its way there: the offsets it passes
  // through are not the reader leaving the end, so only the reader's own drag
  // or arriving ends it
  const tailScrollInFlightRef = useRef(false)
  // armed by the reader's own drag, so a short list whose top is visible on
  // mount never asks for history nobody asked for.
  const startReachedArmedRef = useRef(false)
  const endReachedForLengthRef = useRef(-1)
  const contentHeightRef = useRef(0)
  const contentInsetBottomRef = useRef(0)
  const scrollOffsetRef = useRef(0)
  // the last item's key at the last content size event. a different key now
  // means a row arrived at the tail since, also in a thread that keeps a fixed
  // page and drops its oldest row as a new one lands, where the count holds.
  // synced in a layout effect, never the render body, so the compiler keeps
  // memoizing.
  const tailKey =
    items.length > 0 ? keyExtractor(items[items.length - 1], items.length - 1) : null
  const tailKeyRef = useRef(tailKey)
  useLayoutEffect(() => {
    tailKeyRef.current = tailKey
  })
  const pinnedTailKeyRef = useRef(tailKey)

  const viewportRows =
    Math.ceil(windowHeight / estimatedItemHeight) + WINDOW_ROWS_BEYOND_VIEWPORT
  const expandRows = viewportRows * EXPAND_VIEWPORTS
  const windowRows = Math.min(items.length, viewportRows + extraWindowRows)
  const mountedItems = useMemo(
    () =>
      windowRows === 0
        ? []
        : atEnd
          ? items.slice(-windowRows)
          : items.slice(0, windowRows),
    [atEnd, items, windowRows],
  )
  const firstMountedIndex = atEnd ? items.length - mountedItems.length : 0
  const spacerHeight = (items.length - mountedItems.length) * estimatedItemHeight

  const scrollToEnd = useCallback(
    (options?: { animated?: boolean; viewOffset?: number }) => {
      const scrollView = scrollRef.current
      if (!scrollView) return
      const viewOffset = options?.viewOffset ?? 0
      // an instant pin to the end while a tail scroll runs takes the scroll to
      // the new end instead of cutting it short
      const animated =
        (options?.animated ?? false) ||
        (viewOffset === 0 && tailScrollInFlightRef.current)
      if (animated && viewOffset === 0) tailScrollInFlightRef.current = true
      const contentHeight = contentHeightRef.current
      const viewportHeight = viewportHeightRef.current
      if (viewOffset === 0 || contentHeight <= 0 || viewportHeight <= 0) {
        scrollView.scrollToEnd({ animated })
        return
      }
      scrollView.scrollTo({
        y: Math.max(
          0,
          contentHeight + contentInsetBottomRef.current - viewportHeight - viewOffset,
        ),
        animated,
      })
    },
    [],
  )

  useImperativeHandle(
    ref,
    () => ({ scrollToEnd, isFollowingTail: () => followingTailRef.current }),
    [scrollToEnd],
  )

  const handleContentInsetChange = useCallback(
    (insets: Insets) => {
      contentInsetBottomRef.current = insets.bottom ?? 0
      // a composer collapsing as its row sends moves the end while that row's
      // tail scroll runs; the scroll takes the new end instead of jumping there
      if (atEnd && followTail && followingTailRef.current) scrollToEnd()
    },
    [atEnd, followTail, scrollToEnd],
  )

  // an end-anchored list is at its end before the first paint and before the
  // spacer is observed, so nothing ever sees the transient offset 0 and mounts
  // rows for it. (react-native-web ignores the scroll view's contentOffset.)
  useLayoutEffect(() => {
    if (atEnd) scrollRef.current?.scrollToEnd({ animated: false })
  }, [atEnd])

  // a new page of rows builds at transition priority, the way VirtualView
  // prerenders: the reader's scroll and taps never wait on it, and the rows
  // land before the reader reaches them. it sets a target, never an increment:
  // scroll events that arrive while a page is still pending name the same
  // target instead of stacking pages.
  const growWindow = useCallback(
    (rows: number) => {
      const target = windowRows + rows - viewportRows
      startTransition(() => setExtraWindowRows((current) => Math.max(current, target)))
    },
    [viewportRows, windowRows],
  )

  // how far the reader's lookahead reaches into the spacer. mount at least a
  // page, and enough rows to cover the whole reach, so the rows they scroll
  // onto already exist even after a jump deep into the spacer. content size
  // changes run it too: rows shorter than the estimate can leave a reader who
  // stopped scrolling inside what is still spacer.
  const growToReach = useCallback(
    (offsetY: number, viewport: number, contentHeight: number) => {
      if (windowRows >= items.length) return
      const spacerReach = atEnd
        ? spacerHeight + viewport * EXPAND_VIEWPORTS - offsetY
        : offsetY + viewport * (1 + EXPAND_VIEWPORTS) - (contentHeight - spacerHeight)
      if (spacerReach < 0) return
      const rows = Math.max(expandRows, Math.ceil(spacerReach / estimatedItemHeight))
      growWindow(rows)
    },
    [
      atEnd,
      estimatedItemHeight,
      expandRows,
      growWindow,
      items.length,
      spacerHeight,
      windowRows,
    ],
  )

  // web only: the spacer came within reach of the visible area. a start-anchored
  // list keeps an empty spacer after its last row, so a page whose document
  // scrolls, and never sends the list a scroll event, still reaches the end.
  const handleSpacerReach = useCallback(
    (reach: number) => {
      if (windowRows < items.length) {
        const rows = Math.max(expandRows, Math.ceil(reach / estimatedItemHeight))
        growWindow(rows)
        return
      }
      if (!atEnd && onEndReached && endReachedForLengthRef.current !== items.length) {
        endReachedForLengthRef.current = items.length
        onEndReached()
      }
    },
    [
      atEnd,
      estimatedItemHeight,
      expandRows,
      growWindow,
      items.length,
      onEndReached,
      windowRows,
    ],
  )

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentInset, contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent
      contentHeightRef.current = contentSize.height
      scrollOffsetRef.current = contentOffset.y
      contentInsetBottomRef.current = contentInset?.bottom ?? 0
      const viewport = layoutMeasurement.height
      const distanceFromEnd =
        contentSize.height + contentInsetBottomRef.current - (contentOffset.y + viewport)
      if (distanceFromEnd <= TAIL_SCROLL_ARRIVED_PX) tailScrollInFlightRef.current = false
      followingTailRef.current =
        distanceFromEnd <= NEAR_END_PX || tailScrollInFlightRef.current
      const edgeThreshold = viewport * EDGE_REACHED_VIEWPORT_FRACTION
      growToReach(contentOffset.y, viewport, contentSize.height)

      if (atEnd) {
        if (contentOffset.y <= edgeThreshold) {
          if (onStartReached && startReachedArmedRef.current) {
            startReachedArmedRef.current = false
            onStartReached()
          }
        } else if (contentOffset.y > viewport) {
          startReachedArmedRef.current = true
        }
      } else {
        if (distanceFromEnd <= edgeThreshold) {
          // every loaded row is mounted before more are requested, so an
          // estimated spacer never pulls the next page early.
          if (
            onEndReached &&
            windowRows === items.length &&
            endReachedForLengthRef.current !== items.length
          ) {
            endReachedForLengthRef.current = items.length
            onEndReached()
          }
        } else if (distanceFromEnd > viewport) {
          endReachedForLengthRef.current = -1
        }
      }
      onScrollProp?.(event)
    },
    [
      atEnd,
      growToReach,
      items.length,
      onEndReached,
      onScrollProp,
      onStartReached,
      windowRows,
    ],
  )

  const handleScrollBeginDrag = useCallback(() => {
    tailScrollInFlightRef.current = false
    startReachedArmedRef.current = true
    onScrollBeginDragProp?.()
  }, [onScrollBeginDragProp])

  // content shorter than its own scroll view leaves the reader at the end with
  // no scroll to report it, so a start-anchored list asks for more then, the
  // way FlatList does. a list the document scrolls lays out exactly as tall as
  // its content and never passes; its spacer observer reports the end instead.
  const reachEndIfShort = useCallback(
    (contentHeight: number, viewport: number) => {
      if (
        !atEnd &&
        onEndReached &&
        contentHeight > 0 &&
        contentHeight < viewport &&
        windowRows === items.length &&
        endReachedForLengthRef.current !== items.length
      ) {
        endReachedForLengthRef.current = items.length
        onEndReached()
      }
    },
    [atEnd, items.length, onEndReached, windowRows],
  )

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height
      viewportHeightRef.current = height
      if (atEnd && alignContentAtEnd) setAlignedViewportHeight(height)
      if (atEnd && pinAtEndOnLayout && followingTailRef.current) scrollToEnd()
      reachEndIfShort(contentHeightRef.current, height)
    },
    [alignContentAtEnd, atEnd, pinAtEndOnLayout, reachEndIfShort, scrollToEnd],
  )

  const handleContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeightRef.current = height
      const appended = tailKeyRef.current !== pinnedTailKeyRef.current
      pinnedTailKeyRef.current = tailKeyRef.current
      if (settleTimerRef.current) holdLayoutMotion()
      if (atEnd && followTail && followingTailRef.current) {
        scrollToEnd({
          animated: animateTailPinOnAppend && appended,
        })
        return
      }
      // before the first layout the list has no viewport to measure reach
      // against; onLayout and the first scroll take over from there.
      const viewportHeight = viewportHeightRef.current
      if (viewportHeight === 0) return
      reachEndIfShort(height, viewportHeight)
      // the offset clamps to the new end when content shrinks. a list the
      // document scrolls lays out as tall as its content, so the window bounds
      // the viewport.
      const viewport = Math.min(viewportHeight, windowHeight)
      const offsetY = Math.min(scrollOffsetRef.current, Math.max(0, height - viewport))
      growToReach(offsetY, viewport, height)
    },
    [
      animateTailPinOnAppend,
      atEnd,
      followTail,
      growToReach,
      holdLayoutMotion,
      reachEndIfShort,
      scrollToEnd,
      windowHeight,
    ],
  )

  const spacer =
    spacerHeight > 0 || !atEnd ? (
      <ListSpacer
        height={spacerHeight}
        side={atEnd ? 'before' : 'after'}
        onReach={handleSpacerReach}
      />
    ) : null
  const endAligned = atEnd && alignContentAtEnd
  const shortList = endAligned && fillerOpen
  const layoutMotion =
    rowMotion && (shortList || layoutMotionSettling) ? rowMotion.layout : undefined
  const enteringMotion = rowMotion && shortList ? rowMotion.entering : undefined
  const rowMotionNow = useMemo(
    () =>
      carriesRowMotion ? { layout: layoutMotion, entering: enteringMotion } : undefined,
    [carriesRowMotion, enteringMotion, layoutMotion],
  )
  const rows = mountedItems.map((item, index) => (
    <VirtualRow
      key={keyExtractor(item, firstMountedIndex + index)}
      estimatedHeight={estimatedItemHeight}
      motion={rowMotionNow}
    >
      {renderItem(item, firstMountedIndex + index)}
    </VirtualRow>
  ))

  const scrollProps: ScrollViewProps = {
    style,
    contentContainerStyle: [
      endAligned
        ? { minHeight: Math.max(0, alignedViewportHeight - endContentInset) }
        : null,
      contentContainerStyle,
    ],
    testID,
    maintainVisibleContentPosition: atEnd ? MAINTAIN_VISIBLE_CONTENT_POSITION : undefined,
    onLayout: handleLayout,
    onScroll: handleScroll,
    onScrollBeginDrag: handleScrollBeginDrag,
    onContentSizeChange: handleContentSizeChange,
    scrollEventThrottle: 16,
    showsVerticalScrollIndicator,
    contentInsetAdjustmentBehavior,
    children: (
      <>
        {endAligned ? (
          <View
            collapsable={false}
            style={END_ALIGNED_FILLER_STYLE}
            onLayout={handleFillerLayout}
          />
        ) : null}
        {header}
        {items.length === 0 ? empty : null}
        {atEnd ? spacer : null}
        {carriesRowMotion ? (
          <LayoutAnimationConfig skipEntering>{rows}</LayoutAnimationConfig>
        ) : (
          rows
        )}
        {atEnd ? null : spacer}
        {footer}
      </>
    ),
  }

  if (renderScroll)
    return <>{renderScroll(scrollProps, scrollRef, handleContentInsetChange)}</>

  return (
    <ScrollView
      ref={(node) => {
        scrollRef.current = node
      }}
      {...scrollProps}
    />
  )
}
