import { useParams } from 'one'

export default function ThreadPage() {
  const params = useParams()

  return (
    <main id="thread-page">
      <h1>Thread</h1>
      <p id="thread-id">{params.id}</p>
    </main>
  )
}
