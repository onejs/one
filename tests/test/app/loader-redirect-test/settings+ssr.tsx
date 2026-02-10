import { type LoaderProps, redirect, useLoader } from 'one'

export function loader(props: LoaderProps) {
  const cookies = props.request?.headers.get('cookie') || ''
  const isAuthed = cookies.includes('test-auth=1')

  if (!isAuthed) {
    return redirect('/')
  }

  return {
    secret: 'settings-secret-data',
    preferences: { theme: 'dark' },
  }
}

export default function Settings() {
  const data = useLoader(loader)

  return (
    <div style={{ padding: 20 }}>
      <p id="settings-page">settings page</p>
      <p id="settings-data">{JSON.stringify(data)}</p>
    </div>
  )
}
