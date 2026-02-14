import { Link, useLoader } from 'one'

export async function loader() {
  return {
    pageMode: 'ssg',
    pageData: 'pure-ssg-other',
  }
}

export default function PureSsgOther() {
  const data = useLoader(loader)

  return (
    <div id="pure-ssg-other">
      <h1>Other SSG Page</h1>
      <p id="pure-ssg-other-data">{JSON.stringify(data)}</p>
      <Link href="/pure-ssg" id="link-back">
        Back to Index
      </Link>
    </div>
  )
}
