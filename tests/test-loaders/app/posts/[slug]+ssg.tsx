import { createRoute, useLoader, useMatches, usePageMatch } from 'one'

const route = createRoute<'/posts/[slug]'>()

export async function generateStaticParams() {
  return [{ slug: 'hello-world' }, { slug: 'another-post' }]
}

export const loader = route.createLoader(async ({ params }) => {
  return {
    title: `Post: ${params.slug}`,
    content: `This is the content for ${params.slug}`,
  }
})

export default function PostPage() {
  const { title, content } = useLoader(loader)
  const matches = useMatches()
  const pageMatch = usePageMatch()

  // Log matches for debugging
  if (typeof window !== 'undefined') {
    console.log('[PostPage] matches:', JSON.stringify(matches, null, 2))
  }

  return (
    <div>
      <h1 id="post-title">{title}</h1>
      <p id="post-content">{content}</p>
      <p id="post-matches-count">Matches: {matches.length}</p>
      <p id="post-page-params">Params: {JSON.stringify(pageMatch?.params)}</p>
      <p id="post-all-matches">{JSON.stringify(matches)}</p>
    </div>
  )
}
