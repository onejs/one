import { createRoute, useLoader } from 'one'

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
  return (
    <div>
      <h1 id="post-title">{title}</h1>
      <p id="post-content">{content}</p>
    </div>
  )
}
