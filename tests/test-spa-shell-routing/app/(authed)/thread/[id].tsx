import { useParams, usePathname } from 'one'

export default function ThreadPage() {
  const pathname = usePathname()
  const { id } = useParams<{ id: string }>()

  return (
    <div id="thread-page">
      <h1>Thread: {id}</h1>
      <span id="thread-pathname">{pathname}</span>
      <span id="thread-id">{id}</span>
    </div>
  )
}
