import { useParams } from 'one'

// case1: single dynamic param, NO +not-found
export function Case1Page() {
  const { param1 } = useParams<{ param1: string }>()
  return (
    <div id="case1-page">
      <span id="case1-param1">{param1}</span>
    </div>
  )
}
