import { type LoaderProps, redirect, useLoader } from 'one'

export function loader(props: LoaderProps) {
  const cookies = props.request?.headers.get('cookie') || ''
  const isAuthed = cookies.includes('test-auth=1')

  if (!isAuthed) {
    // test throw pattern (vs return in dashboard)
    throw redirect('/loader-redirect-test', 307)
  }

  return {
    secret: 'profile-secret-data',
    email: 'user@test.com',
  }
}

export default function Profile() {
  const data = useLoader(loader)

  return (
    <div style={{ padding: 20 }}>
      <p id="profile-page">profile page</p>
      <p id="profile-data">{JSON.stringify(data)}</p>
    </div>
  )
}
