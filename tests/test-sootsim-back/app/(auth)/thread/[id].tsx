import { useParams } from 'one'

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <main id="thread-screen" data-thread-id={id}>
      <h1>Thread {id}</h1>
    </main>
  )
}
