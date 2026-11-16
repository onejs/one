import React, { forwardRef, useEffect } from 'react'
import { Platform } from 'react-native'
import Reanimated, { runOnJS, useSharedValue } from 'react-native-reanimated'

import { ClippingScrollView } from '../../bindings'
import { useAnimatedProps, useAnimatedReaction, useDerivedValue } from '../../reanimated'

import styles from './styles'

import type { ScrollViewProps } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'

const OS = Platform.OS
const ReanimatedClippingScrollView =
  OS === 'android'
    ? Reanimated.createAnimatedComponent(ClippingScrollView)
    : ClippingScrollView

type AnimatedScrollViewProps = React.ComponentProps<typeof Reanimated.ScrollView>

export type AnimatedScrollViewComponent = React.ComponentType<
  AnimatedScrollViewProps & React.RefAttributes<Reanimated.ScrollView>
>

export type ScrollViewContentInsets = {
  top: number
  bottom: number
  left: number
  right: number
}

type ScrollViewWithBottomPaddingProps = {
  ScrollViewComponent: AnimatedScrollViewComponent
  children?: React.ReactNode
  inverted?: boolean
  bottomPadding: SharedValue<number>
  /** Padding for scroll indicator insets (excludes blankSpace). Falls back to bottomPadding when not provided. */
  scrollIndicatorPadding?: SharedValue<number>
  /** Absolute Y content offset (iOS only, for KeyboardChatScrollView). */
  contentOffsetY?: SharedValue<number>
  applyWorkaroundForContentInsetHitTestBug?: boolean
  /**
   * Fires whenever the effective content inset changes (combines the static `contentInset`
   * prop with the dynamic keyboard-driven padding). Useful on Android where the synthetic
   * inset is not reflected in `onScroll` events.
   */
  onContentInsetChange?: (insets: ScrollViewContentInsets) => void
} & ScrollViewProps

const ScrollViewWithBottomPadding = forwardRef<
  Reanimated.ScrollView,
  ScrollViewWithBottomPaddingProps
>(
  (
    {
      ScrollViewComponent,
      bottomPadding,
      scrollIndicatorPadding,
      contentInset,
      scrollIndicatorInsets,
      inverted,
      contentOffsetY,
      applyWorkaroundForContentInsetHitTestBug,
      onContentInsetChange,
      children,
      ...rest
    },
    ref
  ) => {
    const { contentOffset } = rest
    const prevContentOffsetY = useSharedValue<number | null>(null)

    useEffect(() => {
      if (contentOffsetY) {
        // eslint-disable-next-line react-compiler/react-compiler
        contentOffsetY.value = contentOffset?.y ?? 0
      }
    }, [contentOffsetY, contentOffset?.y])

    const insets = useDerivedValue(() => {
      const dynamicTop = inverted ? bottomPadding.value : 0
      const dynamicBottom = !inverted ? bottomPadding.value : 0

      return {
        dynamic: {
          top: dynamicTop,
          bottom: dynamicBottom,
        },
        effective: {
          top: dynamicTop + (contentInset?.top || 0),
          bottom: dynamicBottom + (contentInset?.bottom || 0),
          left: contentInset?.left || 0,
          right: contentInset?.right || 0,
        } as ScrollViewContentInsets,
      }
    }, [
      inverted,
      contentInset?.top,
      contentInset?.bottom,
      contentInset?.left,
      contentInset?.right,
    ])

    useAnimatedReaction(
      () => insets.value.effective,
      (current, previous) => {
        if (!onContentInsetChange) {
          return
        }
        if (
          previous &&
          current.top === previous.top &&
          current.bottom === previous.bottom &&
          current.left === previous.left &&
          current.right === previous.right
        ) {
          return
        }
        runOnJS(onContentInsetChange)(current)
      },
      [onContentInsetChange]
    )

    const animatedProps = useAnimatedProps(() => {
      const { dynamic, effective } = insets.value

      const indicatorPadding = scrollIndicatorPadding ?? bottomPadding
      const indicatorTop =
        (inverted ? indicatorPadding.value : 0) + (scrollIndicatorInsets?.top || 0)
      const indicatorBottom =
        (!inverted ? indicatorPadding.value : 0) + (scrollIndicatorInsets?.bottom || 0)

      const result: Record<string, unknown> = {
        // iOS prop
        contentInset: effective,
        scrollIndicatorInsets: {
          bottom: indicatorBottom,
          top: indicatorTop,
          right: scrollIndicatorInsets?.right,
          left: scrollIndicatorInsets?.left,
        },
        // Android prop
        contentInsetBottom: dynamic.bottom,
        contentInsetTop: dynamic.top,
      }

      if (contentOffsetY) {
        const y = contentOffsetY.value

        // Emit the initialized offset once, then only when the target changes.
        // Inset-only updates must not replay the previous scroll command.
        if (y !== prevContentOffsetY.value) {
          prevContentOffsetY.value = y
          result.contentOffset = { x: contentOffset?.x ?? 0, y }
        }
      }

      return result
    }, [
      scrollIndicatorInsets?.bottom,
      scrollIndicatorInsets?.top,
      scrollIndicatorInsets?.right,
      scrollIndicatorInsets?.left,
      inverted,
      contentOffsetY,
      contentOffset?.x,
    ])

    return (
      <ReanimatedClippingScrollView
        animatedProps={animatedProps}
        applyWorkaroundForContentInsetHitTestBug={
          applyWorkaroundForContentInsetHitTestBug
        }
        style={styles.container}
      >
        <ScrollViewComponent ref={ref} animatedProps={animatedProps} {...rest}>
          {children}
        </ScrollViewComponent>
      </ReanimatedClippingScrollView>
    )
  }
)

export default ScrollViewWithBottomPadding
