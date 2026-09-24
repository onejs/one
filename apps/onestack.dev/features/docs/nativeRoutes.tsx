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
      { title: 'Text Input', route: '/native/text-input' },
      { title: 'Gradients', route: '/native/gradients' },
    ],
  },

  {
    title: 'iOS',
    pages: [
      { title: 'Color', route: '/native/ios-color' },
      { title: 'Controls', route: '/native/ios-controls' },
      { title: 'Containers', route: '/native/ios-containers' },
      { title: 'Presentations and Tabs', route: '/native/ios-presentations' },
      { title: 'Toolbar and Menus', route: '/native/toolbar' },
      { title: 'SplitView', route: '/native/split-view' },
      { title: 'Zoom Transitions', route: '/native/zoom-transitions' },
    ],
  },

  {
    title: 'Android',
    pages: [
      { title: 'Compose', route: '/native/android-compose' },
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
      { title: 'ImagePicker', route: '/native/image-picker' },
      { title: 'SecureStore', route: '/native/secure-store' },
      { title: 'WebGPU', route: '/native/webgpu' },
    ],
  },

  {
    title: 'Resources',
    pages: [
      { title: 'Migrating from Expo', route: '/native/migrating-from-expo' },
      { title: 'Platform Support', route: '/native/platform-support' },
    ],
  },
]

export const allNativeRoutes = nativeRoutes.flatMap((x) => x.pages || [])
export const allNativeNotPending = allNativeRoutes.filter((x) => !x['pending'])
