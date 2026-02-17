import { createRoute, useLoader } from 'one'

const route = createRoute<'/not-found/fallback/[slug]'>()

export async function generateStaticParams() {
  return [{ slug: 'valid-entry' }]
}

export const loader = route.createLoader(async ({ params }) => {
  return {
    title: `Fallback: ${params.slug}`,
    content: `content for ${params.slug}`,
  }
})

export default function FallbackSlugPage() {
  const { title, content } = useLoader(loader)
  return (
    <div>
      <h1 id="fallback-title">{title}</h1>
      <p id="fallback-content">{content}</p>
    </div>
  )
}
