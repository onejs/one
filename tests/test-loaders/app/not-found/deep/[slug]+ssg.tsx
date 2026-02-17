import { createRoute, useLoader } from 'one'

const route = createRoute<'/not-found/deep/[slug]'>()

export async function generateStaticParams() {
  return [{ slug: 'valid-item' }]
}

export const loader = route.createLoader(async ({ params }) => {
  return {
    title: `Deep: ${params.slug}`,
    content: `content for ${params.slug}`,
  }
})

export default function DeepSlugPage() {
  const { title, content } = useLoader(loader)
  return (
    <div>
      <h1 id="deep-title">{title}</h1>
      <p id="deep-content">{content}</p>
    </div>
  )
}
