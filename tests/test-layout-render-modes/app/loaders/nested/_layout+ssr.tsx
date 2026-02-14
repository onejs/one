import { Slot, useMatch, useMatches } from 'one'

// nested layout with SSR loader - tests SSR inside SSG
export async function loader() {
  return {
    nestedLayoutMode: 'ssr',
    nestedLayoutLoaderRan: true,
    timestamp: Date.now(),
    random: Math.random(),
  }
}

export default function NestedLayout() {
  const myMatch = useMatch('./loaders/nested/_layout+ssr.tsx')
  const data = myMatch?.loaderData as { nestedLayoutMode: string; nestedLayoutLoaderRan: boolean; timestamp: number; random: number } | undefined
  const matches = useMatches()

  return (
    <div id="nested-layout" data-mode="ssr">
      <header id="nested-header">
        <span id="nested-mode">Nested Mode: {data?.nestedLayoutMode}</span>
        <span id="nested-matches">Matches: {matches.length}</span>
        <span id="nested-random">Random: {data?.random}</span>
      </header>
      <div id="nested-layout-data">{JSON.stringify(data)}</div>
      <Slot />
    </div>
  )
}
