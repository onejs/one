import {
  defineMutatorWithType,
  defineMutatorsWithType,
  createSchema,
  table,
  string,
} from '@rocicorp/zero'
import { NativeZero } from '../../types/zero/native/client'
import { createNativeZero } from '../../types/zero/native/nitro'
import type { Engine } from '../../types/zero/native/types'

const schema = createSchema({
  tables: [table('item').columns({ id: string() }).primaryKey('id')],
})
const define = defineMutatorWithType<typeof schema, { user: string }>()
const registry = defineMutatorsWithType<typeof schema>()({
  item: {
    save: define<{ id: string }>(async ({ tx, args, ctx }) => {
      await tx.mutate.item.upsert({ id: args.id + ctx.user })
    }),
    empty: define<undefined>(async () => {}),
  },
})
declare const engine: Engine
const native = new NativeZero({
  engine,
  schema,
  mutators: registry,
  context: { user: 'u' },
})
native.mutate(registry.item.save({ id: 'i' }))
native.mutate.item.save({ id: 'i' })
native.mutate.item.empty()
// @ts-expect-error registry metadata is not a mutation
native.mutate['~']
// @ts-expect-error required registry input stays required
native.mutate.item.save()
// @ts-expect-error registry inputs retain their type
native.mutate.item.save({ id: 1 })
// @ts-expect-error no-argument registry calls reject null
native.mutate.item.empty(null)

async function factory() {
  const client = await createNativeZero({ name: 'typed', schema, mutators: registry })
  client.mutate.item.save({ id: 'i' })
  client.mutate(registry.item.empty())
  // @ts-expect-error factory retains registry argument types
  client.mutate.item.save({ id: false })
  // @ts-expect-error factory excludes registry metadata
  client.mutate['~']
}
void factory

const legacy = new NativeZero({
  engine,
  schema,
  mutators: { nested: { async save() {} }, async '~'() {} },
})
legacy.mutate.nested.save({ id: 'i' })
legacy.mutate['~']()
