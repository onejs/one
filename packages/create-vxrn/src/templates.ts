import * as BasicTemplateSteps from './steps/one'

export const templates = [
  {
    title: `Basic`,
    value: 'Basic',
    type: 'included-in-monorepo',
    hidden: false,
    repo: {
      url: `https://github.com/onejs/one.git`,
      sshFallback: `git@github.com:onejs/one.git`,
      dir: [`examples`, `one-basic`],
      branch: 'main',
    },
    ...BasicTemplateSteps,
  },

  {
    title: `Tamagui`,
    value: 'Tamagui',
    type: 'external-repo',
    hidden: false,
    repo: {
      url: `https://github.com/tamagui/takeout-free.git`,
      sshFallback: `git@github.com:tamagui/takeout-free.git`,
      dir: [],
      branch: 'main',
    },
    ...BasicTemplateSteps,
  },

  {
    title: `Tamagui Pro`,
    value: 'TamaguiPro',
    type: 'external-link',
    hidden: false,
    externalUrl: 'https://tamagui.dev/takeout',
  },
] as const

export type Template = (typeof templates)[number]
export type CloneableTemplate = Extract<Template, { repo: any }>
