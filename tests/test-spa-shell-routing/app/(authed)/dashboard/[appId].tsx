import { Link, usePathname, useParams } from 'one'

export default function DashboardAppPage() {
  const pathname = usePathname()
  const { appId } = useParams<{ appId: string }>()

  return (
    <div id="dashboard-app-page">
      <h1>Dashboard: {appId}</h1>
      <span id="page-pathname">{pathname}</span>
      <span id="app-id">{appId}</span>
      <Link id="link-to-home" href="/">Home</Link>
    </div>
  )
}
