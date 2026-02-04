import { useParams } from 'one'

// case5: deeply nested, +not-found at leaf
export function Case5Page() {
  const { param1, param2, param3 } = useParams<{
    param1: string
    param2: string
    param3: string
  }>()
  return (
    <div id="case5-page">
      <span id="case5-param1">{param1}</span>
      <span id="case5-param2">{param2}</span>
      <span id="case5-param3">{param3}</span>
    </div>
  )
}
