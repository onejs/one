import { Link, useLoader } from 'one'

export async function loader() {
  return {
    pageMode: 'spa',
    pageData: 'spa-other-in-ssg-shell',
  }
}

export default function OtherSpaInSsgShell() {
  const data = useLoader(loader)

  return (
    <div id="ssg-shell-spa-other">
      <h1>Other SPA Page in SSG Shell</h1>
      <p id="ssg-shell-spa-other-data">{JSON.stringify(data)}</p>
      <Link href="/ssg-shell-spa" id="link-back">
        Back to Index
      </Link>
    </div>
  )
}
