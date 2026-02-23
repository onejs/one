import { useParams } from 'one'

export function generateStaticParams() {
  return [{ atHandle: '@admin' }, { atHandle: '@username123' }]
}

export default function AtHandlePage() {
  const { atHandle } = useParams<{ atHandle: string }>()
  return (
    <div id="at-handle-page">
      <h1>Handle Page</h1>
      <p id="handle-value">{atHandle}</p>
    </div>
  )
}
