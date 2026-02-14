import { Link, useLoader } from 'one'

export async function loader() {
  return {
    pageMode: 'spa',
    pageData: 'pure-spa-other',
  }
}

export default function PureSpaOther() {
  const data = useLoader(loader)

  return (
    <div id="pure-spa-other">
      <h1>Other SPA Page</h1>
      <p id="pure-spa-other-data">{JSON.stringify(data)}</p>
      <Link href="/pure-spa" id="link-back">Back to Index</Link>
    </div>
  )
}
