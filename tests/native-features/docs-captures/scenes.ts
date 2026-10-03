// capture settings per docs scene, shared by the app route and scripts/docs-capture.ts.
// `hold` drags across the subject from `from` to `to` (fractions of its width, at
// `y` of its height) and keeps the finger down while both backgrounds are captured.
export type DocsScene = {
  title: string
  hold?: { from: number; to: number; y: number }
}

export const docsScenes = {
  pager: {
    title: 'Pager',
    hold: { from: 0.2, to: 0.5, y: 0.5 },
  },
} satisfies Record<string, DocsScene>

export type DocsSceneName = keyof typeof docsScenes
