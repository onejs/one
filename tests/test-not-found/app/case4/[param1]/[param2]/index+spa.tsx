import { useParams } from 'one'

// case4: nested dynamic, +not-found at middle level
export function Case4Page() {
  const { param1, param2 } = useParams<{ param1: string; param2: string }>()
  return (
    <div id="case4-page">
      <span id="case4-param1">{param1}</span>
      <span id="case4-param2">{param2}</span>
    </div>
  )
}
