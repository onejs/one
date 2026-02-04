import { useParams } from 'one'

// tests root-level dynamic param inside a directory
export function ServerPage() {
  const { serverId } = useParams<{ serverId: string }>()
  return (
    <div id="server-page">
      <span id="server-id">{serverId}</span>
    </div>
  )
}
