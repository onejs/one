# @vxrn/mdx-rust

A small, fast MDX pipeline for One, built on [satteri](https://satteri.bruits.org)
(Markdown/MDX parsed and compiled in Rust) with syntax highlighting from
[Expressive Code](https://expressive-code.com) (Shiki).

It replaces the `mdx-bundler` + remark/rehype stack in `@vxrn/mdx` with far less
code and a much faster compile. GFM, SmartyPants, frontmatter, and `:::`
directives are built into the parser; heading slugs and code highlighting are the
only bundled plugins.

## Usage

```ts
// server (build / loader)
import { getMDXBySlug } from '@vxrn/mdx-rust'

const { frontmatter, code } = await getMDXBySlug('data/docs', slug)
```

```tsx
// client
import { getMDXComponent } from '@vxrn/mdx-rust/client'

const Component = useMemo(() => getMDXComponent(code), [code])
return <Component components={components} />
```

## API

- `getMDX(source, options?)` → `{ frontmatter, code }`
- `getMDXBySlug(basePath, slug, options?)` → `{ frontmatter, code }`
- `getAllFrontmatter(fromPath)` → `Frontmatter[]`
- `getAllVersionsFromPath(fromPath)` → `string[]`
- `getHeadings(source)` → table-of-contents entries
- `getMDXComponent(code)` (from `@vxrn/mdx-rust/client`)
- `slugPlugin` — the bundled heading-id hast plugin, exported for reuse

### `GetMDXOptions`

- `expressiveCode` — Expressive Code options (themes, frames, styleOverrides,
  plugins), or `false` to skip highlighting. Defaults to `{ themes: ['github-dark'] }`.
- `mdastPlugins` / `hastPlugins` — extra satteri plugins (e.g. a hero/demo
  source injector). These use satteri's `defineMdastPlugin` / `defineHastPlugin`,
  not remark/rehype.
- `publicDir` — for resolving `image:` frontmatter paths (default `./public`).

## Code fence meta

Highlighting, file titles, and line markers use Expressive Code's meta syntax:

    ```tsx title="app/routes/index.tsx" {2-4}
