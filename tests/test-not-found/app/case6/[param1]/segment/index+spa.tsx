import { useParams } from 'one'

// case6: dynamic then static, NO +not-found
export function Case6Page() {
  const { param1 } = useParams<{ param1: string }>()
  return (
    <div id="case6-page">
      <span id="case6-param1">{param1}</span>
    </div>
  )
}
