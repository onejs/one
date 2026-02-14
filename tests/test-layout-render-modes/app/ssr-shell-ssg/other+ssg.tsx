import { Link, useLoader } from 'one'

export async function loader() {
  return {
    pageMode: 'ssg',
    pageData: 'ssg-other-in-ssr-shell',
  }
}

export default function OtherSsgInSsrShell() {
  const data = useLoader(loader)

  return (
    <div id="ssr-shell-ssg-other">
      <h1>Other SSG Page in SSR Shell</h1>
      <p id="ssr-shell-ssg-other-data">{JSON.stringify(data)}</p>
      <Link href="/ssr-shell-ssg" id="link-back">Back to Index</Link>
    </div>
  )
}
