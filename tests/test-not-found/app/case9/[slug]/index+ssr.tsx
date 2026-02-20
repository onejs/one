import fs from 'node:fs'
import path from 'node:path'
import { useLoader } from 'one'

// case9: loader that throws ENOENT for invalid slugs (like MDX loading)
export async function loader({ params }: { params: { slug: string } }) {
  // this will throw ENOENT if the file doesn't exist
  const filePath = path.join(process.cwd(), 'data', `${params.slug}.txt`)
  const content = fs.readFileSync(filePath, 'utf-8')
  return { content, slug: params.slug }
}

export default function Case9Page() {
  const { content, slug } = useLoader(loader)
  return (
    <div id="case9-page">
      <span id="case9-slug">{slug}</span>
      <div id="case9-content">{content}</div>
    </div>
  )
}
