export function generateStaticParams() {
  return [{ slug: ['intro'] }]
}

export default function DocsSlugRoute() {
  return <div id="docs-slug-marker">DOC PAGE</div>
}
