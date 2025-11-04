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
