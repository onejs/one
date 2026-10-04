// namespaces are exercised once; receipt scopes state which operations ran.
export const iosAPIs = [
  'One.iOS.Color',
  'One.iOS.MenuAction',
  'One.iOS.BarButtonItem',
  'One.iOS.SplitView',
  'One.iOS.ToolbarHost',
  'One.iOS.ToolbarItem',
  'One.iOS.ZoomTransitionEnabler',
  'One.iOS.ZoomTransitionSource',
  'One.iOS.ArrangementView',
  'One.iOS.Button',
  'One.iOS.Glass',
  'One.iOS.Image',
  'One.iOS.Text',
  'One.iOS.SignInWithAppleButton',
  'One.iOS.Tab',
  'One.iOS.Tabs',
  'One.iOS.Toolbar',
  'One.iOS.ToolbarItemGroup',
] as const

export function modeAPIs(mode: string, platform: string): string[] {
  const common: Record<string, string[]> = {
    services: [
      'One.AppInfo',
      'One.Storage',
      'One.SecureStore',
      'One.Clipboard',
      'One.Haptics',
      'One.Speech',
      'One.Updates',
      'One.UI.Fonts',
      'One.LaunchScreen',
      'One.Notifications',
    ],
    ui: [
      'One.UI.SafeArea',
      'useSafeAreaInsets',
      'useSizeClass',
      'One.UI.ReservedRegions',
      'One.UI.Blur',
      'One.UI.Mask',
      'One.UI.EdgeFade',
      'One.UI.Pager',
      'One.UI.Portal',
      'One.UI.PortalHost',
      'One.UI.Image',
    ],
    menus:
      platform === 'ios'
        ? ['One.iOS.Menu', 'One.iOS.ContextMenu', 'One.iOS.Alert']
        : ['One.Android.Menu', 'One.Android.ContextMenu', 'One.Android.AlertDialog'],
    widgets: ['One.Widgets', 'One.iOS.WidgetUI', 'One.LiveActivities'],
  }
  common.external = [
    'One.ImagePicker',
    'One.DocumentPicker',
    'One.Browser',
    'One.openShare',
    'One.openURL',
    'One.openSettings',
  ]
  common.ios = platform === 'ios' ? [...iosAPIs] : []
  common['ios-unavailable'] = platform === 'ios' ? ['One.iOS.ArrangementView'] : []
  if (platform !== 'ios') common.widgets = []
  return common[mode] ?? []
}
