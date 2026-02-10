import { type LoaderProps, redirect, useLoader } from 'one'

export function loader(props: LoaderProps) {
  const cookies = props.request?.headers.get('cookie') || ''
  const isAuthed = cookies.includes('test-auth=1')

  if (!isAuthed) {
    return redirect('/loader-redirect-test')
  }

  return {
    secret: 'dashboard-secret-data',
    user: 'test-user',
  }
}

export default function Dashboard() {
  const data = useLoader(loader)

  return (
    <div style={{ padding: 20 }}>
      <p id="dashboard-page">dashboard page</p>
      <p id="dashboard-data">{JSON.stringify(data)}</p>
    </div>
  )
}
