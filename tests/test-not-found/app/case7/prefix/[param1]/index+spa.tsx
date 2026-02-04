import { useParams } from 'one'

// case7: static then dynamic, HAS +not-found
export function Case7Page() {
  const { param1 } = useParams<{ param1: string }>()
  return (
    <div id="case7-page">
      <span id="case7-param1">{param1}</span>
    </div>
  )
}
