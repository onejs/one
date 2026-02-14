import { Link, useLoader } from 'one'

export async function loader() {
  return {
    pageMode: 'ssr',
    pageData: 'pure-ssr-other',
    timestamp: Date.now(),
  }
}

export default function PureSsrOther() {
  const data = useLoader(loader)

  return (
    <div id="pure-ssr-other">
      <h1>Other SSR Page</h1>
      <p id="pure-ssr-other-data">{JSON.stringify(data)}</p>
      <Link href="/pure-ssr" id="link-back">Back to Index</Link>
    </div>
  )
}
