// capture settings per docs scene, shared by the app route and scripts/docs-capture.ts.
// `hold` drags across the subject from `from` to `to` (fractions of its width, at
// `y` of its height) and keeps the finger down while both backgrounds are captured.
// `home` leaves the app once the scene shows and captures the screen from `top` (a
// fraction of its height) down, with rounded corners, for components that live in
// system ui such as picture in picture.
export type DocsScene = {
  title: string
  hold?: { from: number; to: number; y: number }
  home?: { cornerRadius: number; top: number }
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
  pip: { title: 'Picture in Picture', home: { cornerRadius: 48, top: 0.5 } },
  'ios-actions': { title: 'iOS Buttons and Toggles' },
  'ios-pickers': { title: 'iOS Pickers' },
  'ios-progress': { title: 'iOS Progress and Gauges' },
  'ios-text': { title: 'iOS Text and Fields' },
  'ios-lists': { title: 'iOS Lists and Forms' },
} satisfies Record<string, DocsScene>

export type DocsSceneName = keyof typeof docsScenes
