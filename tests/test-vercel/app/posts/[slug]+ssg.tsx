import { useParams } from 'one'

export async function generateStaticParams() {
  return [{ slug: 'hello-world' }, { slug: 'another-post' }, { slug: 'third-article' }]
}

export function loader({ params }: { params: { slug: string } }) {
  return {
    slug: params.slug,
    title: `Post: ${params.slug}`,
    content: `This is the content for ${params.slug}`,
  }
}

export default function PostPage({ loader }: { loader: ReturnType<typeof loader> }) {
  const params = useParams<{ slug: string }>()

  return (
    <div>
      <h1 id="post-title">{loader?.title || `Post: ${params.slug}`}</h1>
      <p id="post-slug">Slug: {loader?.slug || params.slug}</p>
      <p id="post-content">{loader?.content || 'Loading...'}</p>
      <p id="render-mode">Mode: SSG</p>
    </div>
  )
}
