import { useParams, usePathname } from 'one'

export default function ChannelPage() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>()
  const pathname = usePathname()

  return (
    <div id="channel-page">
      <h1>Channel: {serverId}/{channelId}</h1>
      <span id="page-pathname">{pathname}</span>
      <span id="server-id">{serverId}</span>
      <span id="channel-id">{channelId}</span>
    </div>
  )
}
