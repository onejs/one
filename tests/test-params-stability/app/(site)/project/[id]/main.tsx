import { useParams } from 'one'

export default function ProjectMainPage() {
  const params = useParams<{ id: string }>()

  return <div id="project-page">project {params.id}</div>
}
