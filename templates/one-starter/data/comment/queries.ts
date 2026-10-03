import { serverWhere, zql } from 'on-zero'

// comments follow the public visibility of the starter feed.
const publicCommentPermission = serverWhere('comment', () => true)

export const commentsByPostId = (props: { postId: string }) => {
  return zql.comment
    .where(publicCommentPermission)
    .where('postId', props.postId)
    .orderBy('createdAt', 'asc')
    .related('user', (u) => u.one())
}
