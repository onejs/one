// capture settings per docs scene, shared by the app route and scripts/docs-capture.ts.
// `hold` drags across the subject from `from` to `to` (fractions of its width, at
// `y` of its height) and keeps the finger down while both backgrounds are captured.
// `screen` captures the real screen from `top` (a fraction of its height) down, with
// rounded corners, for components drawn by the system: with `press`, a sheet or alert
// the scene presents on a long press, and with `home`, picture in picture after leaving the app.
export type DocsScene = {
  title: string
  hold?: { from: number; to: number; y: number }
  screen?: { cornerRadius: number; top: number; press?: boolean; home?: boolean }
}

export const docsScenes = {
  pager: {
    title: 'Pager',
    hold: { from: 0.2, to: 0.5, y: 0.5 },
  },
  portal: { title: 'Portal' },
  map: { title: 'Map' },
  image: { title: 'Image' },
  icon: { title: 'Icon' },
  pip: { title: 'Picture in Picture', screen: { cornerRadius: 48, top: 0.5, home: true } },
  'ios-actions': { title: 'iOS Buttons and Toggles' },
  'ios-pickers': { title: 'iOS Pickers' },
  'ios-progress': { title: 'iOS Progress and Gauges' },
  'ios-text': { title: 'iOS Text and Fields' },
  'ios-lists': { title: 'iOS Lists and Forms' },
  'ios-stacks': { title: 'iOS Stacks' },
  'ios-groups': { title: 'iOS Groups' },
  'ios-presentations': { title: 'iOS Presentations', screen: { cornerRadius: 62, top: 0.3, press: true } },
  'ios-tabs': { title: 'iOS Tabs' },
  'ios-navigation': { title: 'iOS Navigation' },
  'ios-media': { title: 'iOS Media' },
  'ios-color': { title: 'iOS Color' },
  'android-compose': { title: 'Android Compose' },
  'android-menu': { title: 'Android Menus', screen: { cornerRadius: 48, top: 0.3, press: true } },
  'android-icons': { title: 'Android Icons' },
  'android-color': { title: 'Android Color' },
} satisfies Record<string, DocsScene>

export type DocsSceneName = keyof typeof docsScenes
