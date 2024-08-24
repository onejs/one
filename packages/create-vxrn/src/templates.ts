import stepsBare from './steps/bare'
import setupFullstack from './steps/fullstack'
import setupBasic from './steps/vxs'

export const templates = [
  {
    title: `Basic`,
    value: 'Basic',
    type: 'included-in-monorepo',
    hidden: false,
    repo: {
      url: `https://github.com/universal-future/vxrn.git`,
      sshFallback: `git@github.com:universal-future/vxrn.git`,
      dir: [`examples`, `basic`],
      branch: 'main',
    },
    extraSteps: setupBasic,
  },

  {
    title: `fullstack`,
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
