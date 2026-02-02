/**
 * React Native implementation using native views (iOS only).
 * Web and Android fall back to passthrough/null behavior.
 */

import type { PropsWithChildren } from 'react'
import { Platform, StyleSheet, type ViewProps, type ColorValue } from 'react-native'

// Check if native views are available (iOS only, bridgeless mode)
const areNativeViewsAvailable =
  Platform.OS === 'ios' &&
  !Platform.isTV &&
  (globalThis as any).RN$Bridgeless === true

// Conditionally load native views
let NativeLinkPreviewViewComponent: React.ComponentType<any> | null = null
let LinkPreviewNativeActionViewComponent: React.ComponentType<any> | null = null
let NativeLinkPreviewContentViewComponent: React.ComponentType<any> | null = null

if (areNativeViewsAvailable) {
  try {
    // Dynamic require to only load on iOS
    const { requireNativeView } = require('expo')
    NativeLinkPreviewViewComponent = requireNativeView('OneLinkPreviewModule', 'NativeLinkPreviewView')
    LinkPreviewNativeActionViewComponent = requireNativeView(
      'OneLinkPreviewModule',
      'LinkPreviewNativeActionView'
    )
    NativeLinkPreviewContentViewComponent = requireNativeView(
      'OneLinkPreviewModule',
      'NativeLinkPreviewContentView'
    )
  } catch (e) {
    // Native module not available, features disabled
    if (__DEV__) {
      console.warn('[one-router] Native link preview module not available:', e)
    }
  }
}

// #region Action View
export interface NativeLinkPreviewActionProps {
  identifier: string
  title: string
  icon?: string
  children?: React.ReactNode
  disabled?: boolean
  destructive?: boolean
  discoverabilityLabel?: string
  subtitle?: string
  accessibilityLabel?: string
  accessibilityHint?: string
  displayAsPalette?: boolean
  displayInline?: boolean
  preferredElementSize?: 'auto' | 'small' | 'medium' | 'large'
  isOn?: boolean
  keepPresented?: boolean
  hidden?: boolean
  tintColor?: ColorValue
  barButtonItemStyle?: 'plain' | 'prominent'
  sharesBackground?: boolean
  hidesSharedBackground?: boolean
  onSelected: () => void
}

export function NativeLinkPreviewAction(props: NativeLinkPreviewActionProps) {
  if (!LinkPreviewNativeActionViewComponent) {
    return null
  }
  return <LinkPreviewNativeActionViewComponent {...props} />
}
// #endregion

// #region Preview View
export interface TabPath {
  oldTabKey: string
  newTabKey: string
}

export interface NativeLinkPreviewProps extends ViewProps {
  nextScreenId: string | undefined
  tabPath:
    | {
        path: TabPath[]
      }
    | undefined
  disableForceFlatten?: boolean
  onWillPreviewOpen?: () => void
  onDidPreviewOpen?: () => void
  onPreviewWillClose?: () => void
  onPreviewDidClose?: () => void
  onPreviewTapped?: () => void
  onPreviewTappedAnimationCompleted?: () => void
  children: React.ReactNode
}

export function NativeLinkPreview(props: NativeLinkPreviewProps) {
  if (!NativeLinkPreviewViewComponent) {
    return props.children as React.ReactElement
  }
  return <NativeLinkPreviewViewComponent {...props} />
}
// #endregion

// #region Preview Content View
export interface NativeLinkPreviewContentProps extends ViewProps {
  preferredContentSize?: { width: number; height: number }
}

export function NativeLinkPreviewContent(props: PropsWithChildren<NativeLinkPreviewContentProps>) {
  if (!NativeLinkPreviewContentViewComponent) {
    return null
  }
  const style = StyleSheet.flatten([
    props.style,
    {
      position: 'absolute' as const,
      top: 0,
      left: 0,
    },
  ])
  return <NativeLinkPreviewContentViewComponent {...props} style={style} />
}
// #endregion
