import { usePathname } from 'one'

export default function GateFeedPage() {
  const pathname = usePathname()
  return (
    <div id="gate-feed-page">
      <h1>Gate Feed</h1>
      <span id="gate-feed-pathname">{pathname}</span>
    </div>
  )
}
