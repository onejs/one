export type LaunchScreenHideOptions = {
  // ios fades the launch screen out instead of removing it at once. android's
  // system splash plays its own exit either way.
  fade?: boolean
}

export interface LaunchScreen {
  // keep the launch screen past the first content until hide(). call it while
  // the app's modules evaluate, before the first render.
  preventAutoHide(): void
  hide(options?: LaunchScreenHideOptions): void
}
