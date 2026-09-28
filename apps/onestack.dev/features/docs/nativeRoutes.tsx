export const nativeRoutes = [
  {
    pages: [{ title: 'Overview', route: '/native' }],
  },

  {
    title: 'Views',
    pages: [
      { title: 'Image', route: '/native/image' },
      { title: 'Icons', route: '/native/icons' },
      { title: 'Effects', route: '/native/effects' },
      { title: 'Map', route: '/native/map' },
      { title: 'Picture in Picture', route: '/native/picture-in-picture' },
      { title: 'Text Input', route: '/native/text-input' },
      { title: 'Gradients', route: '/native/gradients' },
      { title: 'Fonts', route: '/native/fonts' },
      { title: 'Safe Area', route: '/native/safe-area' },
    ],
  },

  {
    title: 'iOS',
    pages: [
      { title: 'Color', route: '/native/ios-color' },
      { title: 'Stacks', route: '/native/ios-stacks' },
      { title: 'Lists and Forms', route: '/native/ios-lists' },
      { title: 'Groups', route: '/native/ios-groups' },
      { title: 'Text and Fields', route: '/native/ios-text-fields' },
      { title: 'Buttons and Toggles', route: '/native/ios-buttons-toggles' },
      { title: 'Pickers', route: '/native/ios-pickers' },
      { title: 'Progress and Gauges', route: '/native/ios-progress-gauges' },
      { title: 'Media and Empty States', route: '/native/ios-media' },
      { title: 'Presentations and Menus', route: '/native/ios-presentations' },
      { title: 'Tabs and Pager', route: '/native/ios-tabs-pager' },
      { title: 'Navigation and Toolbar', route: '/native/ios-navigation' },
      { title: 'Widgets and Live Activities', route: '/native/ios-widgets' },
      { title: 'Toolbar and Menus', route: '/native/toolbar' },
      { title: 'SplitView', route: '/native/split-view' },
      { title: 'Zoom Transitions', route: '/native/zoom-transitions' },
    ],
  },

  {
    title: 'Android',
    pages: [
      { title: 'Compose', route: '/native/android-compose' },
      { title: 'Menus', route: '/native/android-menu' },
      { title: 'Icons', route: '/native/android-icons' },
      { title: 'Color', route: '/native/android-color' },
    ],
  },

  {
    title: 'Platform APIs',
    pages: [
      { title: 'Database', route: '/native/database' },
      { title: 'Notifications', route: '/native/notifications' },
      { title: 'Clipboard', route: '/native/clipboard' },
      { title: 'Network', route: '/native/network' },
      { title: 'Browser', route: '/native/browser' },
      { title: 'Haptics', route: '/native/haptics' },
      { title: 'Crypto', route: '/native/crypto' },
      { title: 'App Info', route: '/native/app-info' },
      { title: 'App Icon', route: '/native/app-icon' },
      { title: 'Device', route: '/native/device' },
      { title: 'Screen Orientation', route: '/native/screen-orientation' },
      { title: 'Screen Capture', route: '/native/screen-capture' },
      { title: 'Contacts', route: '/native/contacts' },
      { title: 'Calendar', route: '/native/calendar' },
      { title: 'ImagePicker', route: '/native/image-picker' },
      { title: 'Camera preview', route: '/native/camera' },
      { title: 'Image Manipulator', route: '/native/image-manipulator' },
      { title: 'DocumentPicker', route: '/native/document-picker' },
      { title: 'SecureStore', route: '/native/secure-store' },
      { title: 'Protected Store', route: '/native/protected-store' },
      { title: 'App Tracking Permission', route: '/native/app-tracking' },
      { title: 'Local Authentication', route: '/native/local-authentication' },
      { title: 'Location', route: '/native/location' },
      { title: 'FileSystem', route: '/native/file-system' },
      { title: 'Audio', route: '/native/audio' },
      { title: 'Share', route: '/native/share' },
      { title: 'Photo Library', route: '/native/photo-library' },
      { title: 'WebGPU', route: '/native/webgpu' },
    ],
  },

  {
    title: 'Resources',
    pages: [
      { title: 'Migrating to One Native', route: '/native/migrating-to-one' },
      { title: 'Platform Support', route: '/native/platform-support' },
    ],
  },
]

export const allNativeRoutes = nativeRoutes.flatMap((x) => x.pages || [])
export const allNativeNotPending = allNativeRoutes.filter((x) => !x['pending'])
