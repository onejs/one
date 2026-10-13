import * as BasicTemplateSteps from './steps/one'

export const templates = [
  {
    title: `Basic`,
    value: 'Basic',
    description: 'The simplest starting point, vanilla React Native',
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
    title: `Takeout`,
    value: 'Takeout',
    description: 'One, Tamagui, Zero, Better Auth',
    type: 'external-repo',
    hidden: false,
    repo: {
      url: `https://github.com/tamagui/takeout2.git`,
      sshFallback: `git@github.com:tamagui/takeout2.git`,
      dir: [],
      branch: 'main',
    },
    ...BasicTemplateSteps,
  },
] as const

export type Template = (typeof templates)[number]
export type CloneableTemplate = Extract<Template, { repo: any }>
