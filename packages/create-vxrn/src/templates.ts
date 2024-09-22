import stepsBare from './steps/bare'
import setupFullstack from './steps/fullstack'
import * as BasicTemplateSteps from './steps/vxs'

export const templates = [
  {
    title: `Demo`,
    value: 'Basic',
    type: 'included-in-monorepo',
    hidden: false,
    repo: {
      url: `https://github.com/universal-future/vxrn.git`,
      sshFallback: `git@github.com:universal-future/vxrn.git`,
      dir: [`examples`, `basic`],
      branch: 'main',
    },
    ...BasicTemplateSteps,
  },

  {
    title: `Empty Project (Vercel)`,
    value: 'Vercel',
    type: 'included-in-monorepo',
    hidden: false,
    repo: {
      url: `https://github.com/universal-future/vxrn.git`,
      sshFallback: `git@github.com:universal-future/vxrn.git`,
      dir: [`examples`, `vercel`],
      branch: 'main',
    },
  },

  {
    title: `User & Auth`,
    value: 'fullstack',
    type: 'included-in-monorepo',
    hidden: false,
    repo: {
      url: `https://github.com/universal-future/vxrn.git`,
      sshFallback: `git@github.com:universal-future/vxrn.git`,
      dir: [`examples`, `fullstack`],
      branch: 'main',
    },
    extraSteps: setupFullstack,
  },

  {
    title: `Bare`,
    value: 'bare',
    type: 'included-in-monorepo',
    hidden: false,
    repo: {
      url: `https://github.com/universal-future/vxrn.git`,
      sshFallback: `git@github.com:universal-future/vxrn.git`,
      dir: [`examples`, `bare`],
      branch: 'main',
    },
    extraSteps: stepsBare,
  },
] as const
