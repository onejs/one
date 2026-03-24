import { type LoaderProps, setResponseHeaders, useLoader } from 'one'

export async function loader(props: LoaderProps) {
  await setResponseHeaders((headers) => {
    headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    headers.set('X-Custom-Header', 'test-value')
  })

  return {
    timestamp: Date.now(),
    path: props.path,
  }
}

export default function CacheHeadersTest() {
  const data = useLoader(loader)

  return (
    <div>
      <h1>Cache Headers Test</h1>
      <span id="timestamp">{data.timestamp}</span>
      <span id="path">{data.path}</span>
    </div>
  )
}
