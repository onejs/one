export function generateStaticParams() {
  return [{ slug: ['peach'] }]
}

export default function DocsSlugRoute() {
  return <div id="docs-slug-marker">DOC PAGE</div>
}
