import { Link, useParams, useLoader } from 'one'

export async function loader({ params }: { params: { id?: string } }) {
  const id = params?.id ?? 'unknown'
  return {
    id,
    message: `Dynamic page for ID: ${id}`,
    timestamp: Date.now(),
  }
}

export default function DynamicPage() {
  const params = useParams<{ id: string }>()
  const data = useLoader(loader)

  return (
    <div>
      <h1 id="dynamic-title">Dynamic Page</h1>
      <p id="render-mode">Mode: SSR (dynamic)</p>
      <p id="param-id">Param ID: {params.id}</p>
      <p id="loader-id">Loader ID: {data.id}</p>
      <p id="loader-message">{data.message}</p>
      <p id="loader-timestamp">Timestamp: {data.timestamp}</p>

      <nav>
        <Link href="/dynamic/456" id="link-other-dynamic">
          Go to ID 456
        </Link>
        <br />
        <Link href="/" id="link-home">
          Back to Home
        </Link>
      </nav>
    </div>
  )
}
