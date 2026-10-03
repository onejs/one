import * as BasicTemplateSteps from './steps/one'
import * as TakeoutTemplateSteps from './steps/takeout'

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
      branch: 'v2-beta',
    },
    ...BasicTemplateSteps,
  },

  {
    title: `Takeout`,
    value: 'Takeout',
    description: 'One, Tamagui, SQLite, Orez Lite, Better Auth',
    type: 'included-in-monorepo',
    hidden: true,
    packageManager: 'bun',
    repo: {
      url: `https://github.com/onejs/one.git`,
      sshFallback: `git@github.com:onejs/one.git`,
      dir: [`templates`, `one-starter`],
      branch: 'v2-beta-starter',
    },
    ...TakeoutTemplateSteps,
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
