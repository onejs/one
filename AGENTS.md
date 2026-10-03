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

## Operations

- Publish beta versions from branches without asking. Require explicit user permission for stable releases.
- Create worktrees only under `~/.worktrees/one-<slug>`, from a freshly fetched `origin/main`. Never in `/tmp`, a scratchpad, or inside the repo.
- The session that creates a worktree owns it. When the task ends, either
  `git worktree remove <path>` from the primary checkout, or leave it clean with
  every commit pushed to its branch, and say which in your final report.
- Uncommitted work in a worktree at session end is lost work. Commit it to the
  branch and push, as a `wip:` commit if unfinished, before you stop.
- Managers prune without asking: any worktree with no live owner, a clean tree,
  and a HEAD reachable from `origin` is removed. `tm drift` is the audit.

## Commit Messages

- Keep commit messages short and simple
- NO attribution lines (no "Generated with Claude Code", no "Co-Authored-By")
- NO wordy descriptions - just state what was changed

## Fast upstream releases

- Run `bun release --into ~/<downstream>` in an isolated worktree to build the installed package family and replace downstream `node_modules` immediately. No commit, push, publish, CI, or tests are required. Use `--skip-build` only for outputs already built from your current source.
- Push `v2-beta` to publish a canary independently of full CI. Canaries build and publish without test gates; normal beta and stable releases keep their existing gates.
- Use any canary, including your own, without waiting for an official beta. Pin the printed version because the shared `canary` tag moves. Record the source branch.
- Verify content by packing the exact npm version and inspecting changed dist or source files and `releaseSourceCommit` in its manifest. A matching version string alone proves nothing.
- State the validation actually performed in each commit message body. Write `Validation: none` when no checks were run. Do not imply a canary has passed tests.
