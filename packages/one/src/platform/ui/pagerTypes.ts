import type { ReactNode } from 'react'
import type { ViewProps } from 'react-native'

export type PagerScrollEvent = Readonly<{
  nativeEvent: Readonly<{ position: number; offset: number }>
}>
export type PagerSelectedEvent = Readonly<{ nativeEvent: Readonly<{ position: number }> }>
export type PagerScrollStateEvent = Readonly<{
  nativeEvent: Readonly<{
    pageScrollState: 'idle' | 'dragging' | 'settling'
  }>
}>
export interface PagerRef {
  setPage(index: number): void
  setPageWithoutAnimation(index: number): void
  setScrollEnabled(enabled: boolean): void
}
export type PagerProps = ViewProps & {
  children?: ReactNode
  initialPage?: number
  scrollEnabled?: boolean
  orientation?: 'horizontal' | 'vertical'
  layoutDirection?: 'ltr' | 'rtl'
  offscreenPageLimit?: number
  pageMargin?: number
  overdrag?: boolean
  overScrollMode?: 'auto' | 'always' | 'never'
  keyboardDismissMode?: 'none' | 'on-drag'
  onPageScroll?: (event: PagerScrollEvent) => void
  onPageSelected?: (event: PagerSelectedEvent) => void
  onPageScrollStateChanged?: (event: PagerScrollStateEvent) => void
}

export function validatePager({
  initialPage = 0,
  pageMargin = 0,
  offscreenPageLimit,
  orientation = 'horizontal',
  layoutDirection = 'ltr',
  keyboardDismissMode = 'none',
  overScrollMode = 'auto',
}: PagerProps) {
  validatePage(initialPage)
  if (!Number.isFinite(pageMargin) || pageMargin < 0)
    throw new Error('Pager.pageMargin must be a finite nonnegative number')
  if (
    offscreenPageLimit !== undefined &&
    offscreenPageLimit !== -1 &&
    (!Number.isInteger(offscreenPageLimit) || offscreenPageLimit < 1)
  )
    throw new Error('Pager.offscreenPageLimit must be -1 or a positive integer')
  if (orientation !== 'horizontal' && orientation !== 'vertical')
    throw new Error('Pager.orientation must be horizontal or vertical')
  if (layoutDirection !== 'ltr' && layoutDirection !== 'rtl')
    throw new Error('Pager.layoutDirection must be ltr or rtl')
  if (keyboardDismissMode !== 'none' && keyboardDismissMode !== 'on-drag')
    throw new Error('Pager.keyboardDismissMode must be none or on-drag')
  if (!['auto', 'always', 'never'].includes(overScrollMode))
    throw new Error('Pager.overScrollMode must be auto, always or never')
}
export function validatePage(index: number) {
  if (!Number.isInteger(index) || index < 0 || index > 2147483647)
    throw new Error('Pager page index must be a nonnegative 32-bit integer')
}
