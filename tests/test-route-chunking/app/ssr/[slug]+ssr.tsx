import { useLoader } from 'one'

// the ssr counterpart of posts/[slug]+ssg: the loader here runs per request on
// the server, so it exercises the runtime resolution path rather than the build one

export function loader({ params }: { params: { slug: string } }) {
  return {
    slug: params.slug,
    content: `ssr content for ${params.slug}`,
  }
}

export function SsrPage() {
  const data = useLoader(loader)

  return (
    <div>
      <h1 id="ssr-slug">{data.slug}</h1>
      <p id="ssr-content">{data.content}</p>
    </div>
  )
}

export default SsrPage
