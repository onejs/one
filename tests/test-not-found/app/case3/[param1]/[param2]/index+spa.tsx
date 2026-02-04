import { useParams } from 'one'

// case3: nested dynamic params, NO +not-found
export function Case3Page() {
  const { param1, param2 } = useParams<{ param1: string; param2: string }>()
  return (
    <div id="case3-page">
      <span id="case3-param1">{param1}</span>
      <span id="case3-param2">{param2}</span>
    </div>
  )
}
