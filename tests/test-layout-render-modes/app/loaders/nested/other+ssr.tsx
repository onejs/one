import { Link, useLoader, useMatches } from 'one'

export async function loader() {
  return {
    page: 'nested-other',
    timestamp: Date.now(),
  }
}

export default function NestedOther() {
  const data = useLoader(loader)
  const matches = useMatches()

  return (
    <div id="nested-other">
      <h2>Other Nested SSR Page</h2>
      <p id="nested-other-data">{JSON.stringify(data)}</p>
      <p id="nested-other-matches">Matches: {matches.length}</p>
      <Link href="/loaders/nested" id="link-back">
        Back to Nested Index
      </Link>
    </div>
  )
}
