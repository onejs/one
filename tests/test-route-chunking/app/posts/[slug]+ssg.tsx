import { useLoader } from 'one'

// the canonical page body lives in the route tree and two other routes re-export
// it, so this module is both an entry of the server bundle and a dependency of
// two other entries

export async function generateStaticParams() {
  return [{ slug: 'hello-world' }, { slug: 'another-post' }]
}

export function loader({ params }: { params: { slug: string } }) {
  return {
    slug: params.slug,
    content: `content for ${params.slug}`,
  }
}

export function PostPage() {
  const data = useLoader(loader)

  return (
    <div>
      <h1 id="post-slug">{data.slug}</h1>
      <p id="post-content">{data.content}</p>
    </div>
  )
}

export default PostPage
