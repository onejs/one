import { useParams } from 'one'

export default function PostPage() {
  const { postId } = useParams<{ postId: string }>()
  return (
    <div id="nested-spa-post-page">
      <span id="post-id">{postId}</span>
    </div>
  )
}
