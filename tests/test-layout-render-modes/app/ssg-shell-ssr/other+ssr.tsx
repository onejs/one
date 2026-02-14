import { Link, useLoader } from 'one'

export async function loader() {
  return {
    pageMode: 'ssr',
    pageData: 'ssr-other-in-ssg-shell',
    timestamp: Date.now(),
  }
}

export default function OtherSsrInSsgShell() {
  const data = useLoader(loader)

  return (
    <div id="ssg-shell-ssr-other">
      <h1>Other SSR Page in SSG Shell</h1>
      <p id="ssg-shell-ssr-other-data">{JSON.stringify(data)}</p>
      <Link href="/ssg-shell-ssr" id="link-back">
        Back to Index
      </Link>
    </div>
  )
}
