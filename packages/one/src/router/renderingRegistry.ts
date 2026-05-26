import type { ComponentType } from 'react'

import type { StackRender, StackRenderProps } from './web/ScreenRenderContext'

/**
 * Tab bar render component receives bottom-tabs' standard tabBar props plus
 * the children prop is omitted (tab bar replaces only the bar UI, not the
 * screens). The actual prop type from `@react-navigation/bottom-tabs` is
 * `BottomTabBarProps`; we re-export a structural-compatible type so the
 * registry can be typed without a hard dep on bottom-tabs.
 */
export type TabsRenderProps = {
  state: any
  navigation: any
  descriptors: any
  insets: { top: number; right: number; bottom: number; left: number }
}

export type TabsRenderComponent = ComponentType<TabsRenderProps>

export type TabsRender = {
  web?: TabsRenderComponent
  ios?: TabsRenderComponent
  android?: TabsRenderComponent
}

/**
 * Drawer sidebar render component. Receives the standard
 * `DrawerContentComponentProps` from `@react-navigation/drawer`. Replaces
 * the drawer's sidebar content (the list of items / nav UI) but not the
 * drawer chrome itself (overlay, gestures, animation).
 */
export type DrawerRenderProps = {
  state: any
  navigation: any
  descriptors: any
}

export type DrawerRenderComponent = ComponentType<DrawerRenderProps>

export type DrawerRender = {
  web?: DrawerRenderComponent
  ios?: DrawerRenderComponent
  android?: DrawerRenderComponent
}

/**
 * Global render configuration. Populated by `setupRendering()`, typically
 * called from One's setup file. Each navigator (Stack, Tabs) reads from
 * this registry as a fallback when no per-instance `render` prop is set.
 *
 * Per-instance render prop > per-route options.render > setupRendering global.
 */
export type RenderingConfig = {
  Stack?: StackRender
  Tabs?: TabsRender
  Drawer?: DrawerRender
}

let renderingConfig: RenderingConfig = {}

/**
 * Register default render components for One's navigators. Call from your
 * setup file before the app renders. Settings are global - every `<Stack>`
 * and `<Tabs>` instance picks them up unless overridden via prop or
 * per-route options.
 *
 * @example
 * ```ts
 * // app/setup.ts
 * import { setupRendering } from 'one'
 * import { Sheet } from 'tamagui'
 *
 * setupRendering({
 *   Stack: {
 *     web: ({ children, open, dismiss, sheetAllowedDetents }) => (
 *       <Sheet modal open={open} onOpenChange={(o) => !o && dismiss()}
 *              snapPoints={sheetAllowedDetents}>
 *         <Sheet.Overlay />
 *         <Sheet.Frame>{children}</Sheet.Frame>
 *       </Sheet>
 *     ),
 *   },
 *   Tabs: { web: MyCustomTabBar },
 * })
 * ```
 */
export function setupRendering(config: RenderingConfig): void {
  renderingConfig = {
    ...renderingConfig,
    Stack: { ...renderingConfig.Stack, ...config.Stack },
    Tabs: { ...renderingConfig.Tabs, ...config.Tabs },
    Drawer: { ...renderingConfig.Drawer, ...config.Drawer },
  }
}

export function getRenderingConfig(): RenderingConfig {
  return renderingConfig
}

/**
 * For tests - clears the global registry.
 * @internal
 */
export function resetRenderingConfig(): void {
  renderingConfig = {}
}

export type { StackRender, StackRenderProps }
