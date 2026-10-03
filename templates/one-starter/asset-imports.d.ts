/// <reference types="vite/client" />

declare module '*?raw' {
  const source: string
  export default source
}

// bundled image imports are typed as the resolved URL `string` — that is exactly
// what tamagui's `<Image src>` accepts (`src?: string | number`) and what both
// the dev preview bundler and the production build emit. pass the WHOLE import
// to `src` and type image props as `string` — never read `.uri` (typing them as
// `string` makes `.uri` a compile error, which is the point).
declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.jpeg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}

declare module '*.gif' {
  const src: string
  export default src
}

declare module '*.svg' {
  const src: string
  export default src
}
