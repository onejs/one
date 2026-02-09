import * as BasicTemplateSteps from './steps/one'

export const templates = [
  {
    title: `Base`,
    value: 'Base',
    description: 'The simplest starting point',
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
      url: `https://github.com/tamagui/takeout-free.git`,
      sshFallback: `git@github.com:tamagui/takeout-free.git`,
      dir: [],
      branch: 'main',
    },
    ...BasicTemplateSteps,
  },

  {
    title: `Takeout Production`,
    value: 'TakeoutPro',
    description:
      "Takeout + a startup in a repo. Refined stack that's production ready. Home/Terms/Docs, CI/CD, IaC, Integration Tests, Onboarding, Notifications, OTA Updates, Screens, >50 Components, >25 Agent Docs, >30 Scripts. See https://takeout.tamagui.dev",
    type: 'external-link',
    hidden: false,
    externalUrl: 'https://takeout.tamagui.dev',
  },
] as const

export type Template = (typeof templates)[number]
export type CloneableTemplate = Extract<Template, { repo: any }>
