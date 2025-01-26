import type { Query } from '@rocicorp/zero'
import type { Schema } from '~/zero'

export function queryMessageItemRelations(q: Query<Schema, 'message', any>) {
  return q
    .related('reactions')
    .related('channel', (q) => q.one())
    .related('thread', (q) => q.one())
    .related('sender', (q) => q.one())
    .related('replyingTo', (q) =>
      q
        .one()
        .where('deleted', '!=', true)
        .related('sender', (q) => q.one())
    )
    .related('attachments')
}
