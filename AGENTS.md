---
applyTo: "**"
---

# Project Overview

One is a framework that aims to make web and native development with React and React Native much simpler and faster.

One builds on Vite to serve both React web and React Native, it also provides file system–based routing, render modes, loaders, middleware, a CLI, Hono, and more.

To understand more about One, you should search for documentation (`apps/onestack.dev/**/*.mdx`) under the site (`apps/onestack.dev`). This site contains guides, API references, and examples to help you grasp the framework's capabilities and practices.

## Monorepo Structure

- `packages/one/` - Main framework package & Vite plugin
- `packages/vxrn/` - A Vite plugin that makes Vite support React Native
- `packages/vite-plugin-metro/` - Another Vite plugin that makes Vite support React Native
- `apps/onestack.dev/` - Documentation website
- `examples/` - Template projects and demos
- `tests/` - Test suite and some test related stuff for the framework
- `packages/create-vxrn/` - CLI scaffolding tool (`npx one`)

## Worktrees: create in one place, leave none behind

- Create worktrees only under `~/.worktrees/one-<slug>`, from a freshly fetched
  `origin/main`. Never in `/tmp`, a scratchpad, or inside the repo.
- The session that creates a worktree owns it. When the task ends, either
  `git worktree remove <path>` from the primary checkout, or leave it clean with
  every commit pushed to its branch, and say which in your final report.
- Uncommitted work in a worktree at session end is lost work. Commit it to the
  branch and push, as a `wip:` commit if unfinished, before you stop.
- Managers prune without asking: any worktree with no live owner, a clean tree,
  and a HEAD reachable from `origin` is removed. `tm drift` is the audit.
