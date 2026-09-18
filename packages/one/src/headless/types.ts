import type { ComponentType, ReactElement, ReactNode } from 'react'

// shared contract for headless web navigators. see plans/headless-navigators.md

export type ScreenEntry = {
  key: string
  name: string
  params: Record<string, any>
  href: string
  isFocused: boolean
  keepMounted: boolean
  // compiled options: semantic keys plus opaque passthrough of preset keys
  options: Record<string, any>
  // lazy: rendering it mounts the route (descriptor.render underneath)
  element: ReactElement
}

export type UseStackResult = {
  screens: ScreenEntry[]
  focused: ScreenEntry
}

export type UseTabsResult = {
  screens: ScreenEntry[]
  focused: ScreenEntry
}

export type UseDrawerResult = {
  screens: ScreenEntry[]
  focused: ScreenEntry
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

// the subset of Stack.Screen options each presentation understands. these are a
// narrowed view of ScreenEntry['options'], never a copy of it
export type SheetPresentationOptions = {
  sheetAllowedDetents?: number[] | 'fitToContents'
  sheetGrabberVisible?: boolean
  sheetCornerRadius?: number
  sheetExpandsWhenScrolledToEdge?: boolean
  gestureEnabled?: boolean
  title?: string
}

export type ModalPresentationOptions = {
  gestureEnabled?: boolean
  title?: string
}

type PresentationProps<Options> = {
  /** whether the presentation should be visible. toggles as you navigate */
  open: boolean
  /** call with false when your UI dismisses. pops the screen */
  onOpenChange: (open: boolean) => void
  /** the presentation options set on the screen, same vocabulary as native */
  options: Options
  /** the full screen entry: name, params, complete options */
  screen: ScreenEntry
  /** the screen's content */
  children: ReactNode
}

export type SheetPresentationProps = PresentationProps<SheetPresentationOptions>
export type ModalPresentationProps = PresentationProps<ModalPresentationOptions>

export type WebPresentations = {
  sheet?: ComponentType<SheetPresentationProps>
  modal?: ComponentType<ModalPresentationProps>
}
