# starter-mdx

`starter-mdx` renders HAST through a React component map. Its server entry
compiles Markdown and MDX with Satteri without generating or evaluating
JavaScript.

```tsx
import { MDX } from 'starter-mdx'
import { compileMDX } from 'starter-mdx/server'
import { useLoader } from 'one'

export async function loader() {
  return compileMDX('# Hello')
}

export default function Page() {
  const result = useLoader(loader)
  return result ? <MDX hast={result.hast} /> : null
}
```

Both Node and Worker conditions use the same runtime-only, WASI-free Satteri
until `@bruits/satteri-wasm` is published. The runtime contains Markdown, MDX,
and HAST support, but omits Satteri's JavaScript generator.

Static routes can import `compileMDX` from `starter-mdx/build` during
`one build`. SSR routes should use `starter-mdx/server`, which loads the
runtime from disk in Node and as a compiled WebAssembly module in a Worker.

Worker builds should install `starterMDX()` from `starter-mdx/vite` before
the framework plugins. It leaves the compiled WebAssembly import for the
Cloudflare Worker bundler instead of asking Vite to parse the binary.

Literal and boolean JSX attributes are supported. MDX expressions, spread
attributes, ESM blocks, and raw HTML require a build-time MDX compiler and fail
explicitly in this runtime renderer.

apps import the real server entry and run Satteri in their own Worker.
