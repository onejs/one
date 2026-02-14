import { Link, useLoader } from 'one'

export async function loader() {
  return {
    pageMode: 'spa',
    pageData: 'spa-other-in-ssr-shell',
  }
}

export default function OtherSpaInSsrShell() {
  const data = useLoader(loader)

  return (
    <div id="ssr-shell-spa-other">
      <h1>Other SPA Page in SSR Shell</h1>
      <p id="ssr-shell-spa-other-data">{JSON.stringify(data)}</p>
      <Link href="/ssr-shell-spa" id="link-back">Back to Index</Link>
    </div>
  )
}
