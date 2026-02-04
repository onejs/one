import { useParams } from 'one'

// case2: single dynamic param, HAS +not-found
export function Case2Page() {
  const { param1 } = useParams<{ param1: string }>()
  return (
    <div id="case2-page">
      <span id="case2-param1">{param1}</span>
    </div>
  )
}
