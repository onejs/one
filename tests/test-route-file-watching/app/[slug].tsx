import { useParams } from 'one'

export default function DynamicSlug() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <div>
      <h1 data-testid="page-title">Dynamic: {slug}</h1>
      <p data-testid="route-type">dynamic</p>
    </div>
  )
}
