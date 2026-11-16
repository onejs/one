import React, { forwardRef, useCallback, useMemo } from 'react'
import { Platform, StyleSheet } from 'react-native'
import { makeMutable, useAnimatedRef } from 'react-native-reanimated'
import Reanimated from 'react-native-reanimated'

import { useAnimatedStyle, useDerivedValue } from '../../reanimated'
import useCombinedRef from '../hooks/useCombinedRef'
import ScrollViewWithBottomPadding from '../ScrollViewWithBottomPadding'

import { useChatKeyboard } from './useChatKeyboard'
import { useEndVisible } from './useEndVisible'
import { useExtraContentPadding } from './useExtraContentPadding'
import { useFrozenPadding } from './useFrozenPadding'

import type { KeyboardChatScrollViewProps, KeyboardChatScrollViewRef } from './types'
import type { LayoutChangeEvent } from 'react-native'

const OS = Platform.OS
const ZERO_CONTENT_PADDING = makeMutable(0)
const ZERO_BLANK_SPACE = makeMutable(0)

const KeyboardChatScrollView: React.ForwardRefExoticComponent<
  React.PropsWithChildren<KeyboardChatScrollViewProps> &
    React.RefAttributes<KeyboardChatScrollViewRef>
> = forwardRef<KeyboardChatScrollViewRef, KeyboardChatScrollViewProps>(
  (
    {
      children,
      ScrollViewComponent = Reanimated.ScrollView,
      inverted = false,
      keyboardLiftBehavior = 'always',
      freeze = false,
      offset = 0,
      extraContentPadding = ZERO_CONTENT_PADDING,
      blankSpace = ZERO_BLANK_SPACE,
      applyWorkaroundForContentInsetHitTestBug = false,
      onLayout: onLayoutProp,
      onContentSizeChange: onContentSizeChangeProp,
      onEndVisible,
      ...rest
    },
    ref
  ) => {
    const scrollViewRef = useAnimatedRef<Reanimated.ScrollView>()
    const onRef = useCombinedRef(ref, scrollViewRef)
    // on iOS `contentInset.top` lets the content rest below the top edge (e.g.
    // under a transparent header), so the lowest offset is `-contentInset.top`
    const contentInsetTop = OS === 'ios' ? (rest.contentInset?.top ?? 0) : 0
    const minScroll = contentInsetTop > 0 ? -contentInsetTop : 0
    const freezeSV = useDerivedValue(() =>
      typeof freeze === 'boolean' ? freeze : freeze.value
    )
    const {
      padding,
      currentHeight,
      contentOffsetY,
      scroll,
      layout,
      size,
      onLayout: onLayoutInternal,
      onContentSizeChange: onContentSizeChangeInternal,
    } = useChatKeyboard(scrollViewRef, {
      inverted,
      keyboardLiftBehavior,
      freeze: freezeSV,
      offset,
      minScroll,
      blankSpace,
      extraContentPadding,
      initialContentOffsetY: rest.contentOffset?.y,
    })

    useExtraContentPadding({
      scrollViewRef,
      extraContentPadding,
      keyboardPadding: padding,
      blankSpace,
      scroll,
      layout,
      size,
      contentOffsetY,
      minScroll,
      inverted,
      keyboardLiftBehavior,
      freeze: freezeSV,
    })

    useFrozenPadding({
      freeze: freezeSV,
      offset,
      padding,
    })

    useEndVisible({
      scroll,
      layout,
      size,
      inverted,
      onEndVisible,
    })

    // intentionally clamp `blankSpace` at one ScrollView viewport. The Android
    // `ClippingScrollView` workaround temporarily substitutes padding/range
    // during touch handling, and oversized blank ranges can de-sync during fast
    // momentum gestures. One viewport is enough for the short-content case;
    // larger values only allow scrolling to a fully blank screen which is not
    // the use case for this library. If you found this comment and it causes
    // a bug for you, please open an issue.
    const totalPadding = useDerivedValue(() =>
      Math.min(
        layout.value.height,
        Math.max(blankSpace.value, padding.value + extraContentPadding.value)
      )
    )

    // Scroll indicator inset = keyboard + extraContentPadding (excludes blankSpace).
    // Apps that render into the unsafe area can supply a negative
    // scrollIndicatorInsets adjustment at the application layer.
    const indicatorPadding = useDerivedValue(
      () => padding.value + extraContentPadding.value
    )

    const onLayout = useCallback(
      (e: LayoutChangeEvent) => {
        onLayoutInternal(e)
        onLayoutProp?.(e)
      },
      [onLayoutInternal, onLayoutProp]
    )

    const onContentSizeChange = useCallback(
      (w: number, h: number) => {
        onContentSizeChangeInternal(w, h)
        onContentSizeChangeProp?.(w, h)
      },
      [onContentSizeChangeInternal, onContentSizeChangeProp]
    )

    // Invisible view whose animated style changes every frame during keyboard
    // animation. On Fabric, this forces Reanimated to schedule a commit,
    // which flushes the scrollTo call in the same frame (fixing de-synchronization).
    // see https://github.com/software-mansion/react-native-reanimated/issues/9000
    const commitStyle = useAnimatedStyle(
      () => ({
        transform: [{ translateY: -currentHeight.value }],
      }),
      []
    )
    const commit = useMemo(() => [styles.commitView, commitStyle], [commitStyle])

    return (
      <>
        <ScrollViewWithBottomPadding
          ref={onRef}
          {...rest}
          applyWorkaroundForContentInsetHitTestBug={
            applyWorkaroundForContentInsetHitTestBug
          }
          bottomPadding={totalPadding}
          contentOffsetY={contentOffsetY}
          inverted={inverted}
          scrollIndicatorPadding={indicatorPadding}
          ScrollViewComponent={ScrollViewComponent}
          onContentSizeChange={onContentSizeChange}
          onLayout={onLayout}
        >
          {children}
        </ScrollViewWithBottomPadding>
        <Reanimated.View style={commit} />
      </>
    )
  }
)

const styles = StyleSheet.create({
  commitView: {
    display: 'none',
    position: 'absolute',
  },
})

export default KeyboardChatScrollView
