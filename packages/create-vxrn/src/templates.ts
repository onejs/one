import stepsBare from './steps/bare'
import setupFullstack from './steps/fullstack'
import setupVxs from './steps/vxs'

export const templates = [
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

  {
    title: `vxs`,
    value: 'vxs',
    type: 'included-in-monorepo',
    hidden: false,
    repo: {
      url: `https://github.com/universal-future/vxrn.git`,
      sshFallback: `git@github.com:universal-future/vxrn.git`,
      dir: [`examples`, `vxs`],
      branch: 'main',
    },
    extraSteps: setupVxs,
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
] as const
