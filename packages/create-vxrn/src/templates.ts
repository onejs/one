import stepsBare from './steps/bare'
import setupVxs from './steps/vxs'
// import stepsTamagui from './steps/tamagui'

export const templates = [
  // {
  //   title: `Free - Expo + Next in a production ready monorepo`,
  //   value: 'starter-free',
  //   type: 'free',
  //   hidden: false,
  //   packageManager: 'yarn',
  //   repo: {
  //     url: `https://github.com/tamagui/starter-free.git`,
  //     sshFallback: `git@github.com:tamagui/starter-free.git`,
  //     dir: [],
  //     branch: 'main',
  //   },
  //   extraSteps: starterFree,
  // },

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

  // {
  //   title: `Tamagui`,
  //   value: 'tamagui',
  //   type: 'included-in-monorepo',
  //   hidden: false,
  //   repo: {
  //     url: `https://github.com/universal-future/vxrn.git`,
  //     sshFallback: `git@github.com:universal-future/vxrn.git`,
  //     dir: [`examples`, `tamagui`],
  //     branch: 'main',
  //   },
  //   extraSteps: stepsTamagui,
  // },

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
] as const
