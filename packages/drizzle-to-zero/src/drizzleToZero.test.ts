import { describe, it, expect, assertType } from 'vitest'
import { drizzleToZeroSchema } from './drizzleToZero'
import { tables, relationships } from './fixtures/drizzleSchema'
import { zeroSchema } from './fixtures/zeroSchema'

describe('drizzleToZeroSchema', () => {
  it.skip('should correctly convert Drizzle schema to Zero schema', () => {
    const generated = drizzleToZeroSchema(tables, relationships)
    expect(generated).toEqual(zeroSchema)
  })

  it.skip('should correctly infer types for the Zero schema', () => {
    const generated = drizzleToZeroSchema(tables, relationships)

    tables.users.id

    type x = typeof generated.users.primaryKey

    assertType<typeof generated.users.columns>(zeroSchema.users.columns)
    // broken:
    // assertType<typeof generated.users.primaryKey>(zeroSchema.users.primaryKey)
    // assertType<typeof generated.users.relationships>(zeroSchema.users.relationships)
    assertType<typeof generated.users.tableName>(zeroSchema.users.tableName)

    // assertType<typeof generated.posts>(zeroSchema.posts)
    // assertType<typeof generated.follows>(zeroSchema.follows)
    // assertType<typeof generated.likes>(zeroSchema.likes)
    // assertType<typeof generated.reposts>(zeroSchema.reposts)
    // assertType<typeof generated.replies>(zeroSchema.replies)
  })
})
