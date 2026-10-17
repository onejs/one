import type { ComponentType, ReactNode } from 'react'

export type LaunchScreenHideOptions = {
  // fade the launch screen out instead of removing it at once, on both
  // platforms. android 12 and later fade the system splash; older android
  // versions remove the launch window background at once.
  fade?: boolean
}

export type LaunchScreenCoverProps = {
  // draw the configured artwork (default true). false draws only the ground
  // and background image, for an app that animates its own artwork over them.
  artwork?: boolean
  // drawn over the launch screen in the same full-window space.
  children?: ReactNode
}

export interface LaunchScreen {
  // keep the launch screen past the first content until hide(). call it while
  // the app's modules evaluate, before the first render.
  preventAutoHide(): void
  hide(options?: LaunchScreenHideOptions): void
  // the configured launch screen drawn in react native, exactly where the
  // native one sits, so an app can animate from it and then hide the native
  // one underneath without a visible change. renders nothing on web.
  Cover: ComponentType<LaunchScreenCoverProps>
  // the configured artwork width in points, or null without native.app.splash.
  artworkWidth: number | null
}
