import { useParams, usePathname } from 'one'

export default function ServerPage() {
  const { serverId } = useParams<{ serverId: string }>()
  const pathname = usePathname()

  return (
    <div id="server-page">
      <h1>Server: {serverId}</h1>
      <span id="page-pathname">{pathname}</span>
      <span id="server-id">{serverId}</span>
    </div>
  )
}
