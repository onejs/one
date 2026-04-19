import { useParams } from 'one'

// mirrors soot's app/(site)/preview/[id]/index.tsx.
//
// reproduces the bug where useParams() transiently returns {} on a
// subsequent re-render after returning { id } on the first render. the
// URL stays at /preview/<id> the entire time.
//
// the page logs every render's params to window.__previewRenders so the
// test can assert that every render saw a stable id.
export default function PreviewPage() {
  const params = useParams<{ id: string }>()

  if (typeof window !== 'undefined') {
    const w = window as any
    w.__previewRenders ??= []
    w.__previewRenders.push({
      at: performance.now(),
      url: location.pathname,
      params: { ...params },
    })
  }

  return (
    <div id="preview-page">
      <span id="preview-id">{params.id ?? '(empty)'}</span>
    </div>
  )
}
