// import * as FullstackSteps from './steps/fullstack'
import * as BasicTemplateSteps from './steps/one'

export const templates = [
  {
    title: `Recommended - Drizzle, Postgres, Tamagui, Biome`,
    value: 'Recommended',
    type: 'included-in-monorepo',
    hidden: false,
    repo: {
      url: `https://github.com/onejs/one.git`,
      sshFallback: `git@github.com:onejs/one.git`,
      dir: [`examples`, `one-recommended`],
      branch: 'main',
    },
    ...BasicTemplateSteps,
  },

  {
    title: `Minimal`,
    value: 'Minimal',
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

  // {
  //   title: `Fullstack - Recommended + Supabase Auth flows`,
  //   value: 'Fullstack',
  //   type: 'included-in-monorepo',
  //   hidden: false,
  //   repo: {
  //     url: `https://github.com/onejs/one.git`,
  //     sshFallback: `git@github.com:onejs/one.git`,
  //     dir: [`examples`, `one-basic`],
  //     branch: 'main',
  //   },
  //   ...FullstackSteps,
  // },

  // {
  //   title: `Bare`,
  //   value: 'bare',
  //   type: 'included-in-monorepo',
  //   hidden: false,
  //   repo: {
  //     url: `https://github.com/onejs/one.git`,
  //     sshFallback: `git@github.com:onejs/one.git`,
  //     dir: [`examples`, `bare`],
  //     branch: 'main',
  //   },
  //   extraSteps: stepsBare,
  // },
] as const
