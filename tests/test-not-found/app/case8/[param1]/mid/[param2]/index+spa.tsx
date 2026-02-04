import { useParams } from 'one'

// case8: dynamic/static/dynamic, +not-found at first dynamic
export function Case8Page() {
  const { param1, param2 } = useParams<{ param1: string; param2: string }>()
  return (
    <div id="case8-page">
      <span id="case8-param1">{param1}</span>
      <span id="case8-param2">{param2}</span>
    </div>
  )
}
