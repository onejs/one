// import * as FullstackSteps from './steps/fullstack'
import * as BasicTemplateSteps from "./steps/one";

export const templates = [
  {
    title: `Minimal`,
    value: "Minimal",
    type: "included-in-monorepo",
    hidden: false,
    repo: {
      url: `https://github.com/onejs/one.git`,
      sshFallback: `git@github.com:onejs/one.git`,
      dir: [`examples`, `one-basic`],
      branch: "main",
    },
    ...BasicTemplateSteps,
  },

  {
    title: `Minimal Tamagui`,
    value: "Tamagui",
    type: "included-in-monorepo",
    hidden: false,
    repo: {
      url: `https://github.com/onejs/one.git`,
      sshFallback: `git@github.com:onejs/one.git`,
      dir: [`examples`, `one-tamagui`],
      branch: "main",
    },
    ...BasicTemplateSteps,
  },

  {
    title: `Minimal Tailwind`,
    value: "Tailwind",
    type: "included-in-monorepo",
    hidden: false,
    repo: {
      url: `https://github.com/onejs/one.git`,
      sshFallback: `git@github.com:onejs/one.git`,
      dir: [`examples`, `one-tailwind`],
      branch: "main",
    },
    ...BasicTemplateSteps,
  },

  {
    title: `Fullstack Traditional - Drizzle, Postgres, Tamagui`,
    value: "Recommended",
    type: "included-in-monorepo",
    hidden: false,
    repo: {
      url: `https://github.com/onejs/one.git`,
      sshFallback: `git@github.com:onejs/one.git`,
      dir: [`examples`, `one-recommended`],
      branch: "main",
    },
    ...BasicTemplateSteps,
  },
] as const;
