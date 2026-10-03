import { serverWhere, zql } from 'on-zero'

// the starter feed is public. product-specific private feeds replace this
// permission with their actor-owned predicate instead of dropping the clause.
const publicPostPermission = serverWhere('post', () => true)

export const allPosts = (props: {
  pageSize: number
  cursor?: { id: string; createdAt: number } | null
}) => {
  let q = zql.post
    .where(publicPostPermission)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
    .limit(props.pageSize)
    .related('user', (u) => u.one())
    .related('comments', (c) =>
      c
        .orderBy('createdAt', 'desc')
        .limit(1)
        .related('user', (u) => u.one()),
    )

  if (props.cursor) q = q.start(props.cursor)
  return q
}

export const postById = (props: { postId: string }) => {
  return zql.post
    .where(publicPostPermission)
    .where('id', props.postId)
    .one()
    .related('user', (u) => u.one())
    .related('comments', (c) =>
      c
        .orderBy('createdAt', 'asc')
        .limit(50)
        .related('user', (u) => u.one()),
    )
}

export const postsByUserId = (props: { userId: string; limit?: number }) => {
  return zql.post
    .where(publicPostPermission)
    .where('userId', props.userId)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'desc')
    .limit(props.limit ?? 24)
    .related('user', (u) => u.one())
}
