import { type Href, useParams, useRouter } from 'one'

export function generateStaticParams() {
  return [
    { projectId: 'demo', sessionId: 'main' },
    { projectId: 'demo', sessionId: 'branch' },
  ]
}

export default function ProjectSessionPage() {
  const router = useRouter()
  const { projectId, sessionId } = useParams<{
    projectId: string
    sessionId: string
  }>()

  return (
    <main id="project-session-page">
      <div id="project-id">{projectId}</div>
      <div id="session-id">{sessionId}</div>
      <button
        id="replace-project-session"
        type="button"
        onClick={() => {
          router.replace(`/project/${projectId}/branch` as Href)
        }}
      >
        Replace session
      </button>
    </main>
  )
}
