import { open, type DB } from '@op-engineering/op-sqlite'
import {
  assertOpen,
  requireKey,
  requireName,
  requireValue,
  type DatabaseKeyValue,
} from './keyValueValidate'

// named string stores on ios and android. one sqlite file per name, same verb
// contract as the web localStorage entry. a later open of the same name reads
// the file the previous connection wrote.

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS one_kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
)`

export type { DatabaseKeyValue }

export function openKeyValue(options: { name: string }): DatabaseKeyValue {
  const name = requireName(options?.name)
  const db = open({ name: `one-kv-${name}.sqlite` })
  try {
    db.executeSync(CREATE_TABLE)
  } catch (error) {
    db.close()
    throw error
  }
  return createStore(db)
}

function createStore(db: DB): DatabaseKeyValue {
  let closed = false

  function connection(verb: string): DB {
    assertOpen(verb, closed)
    return db
  }

  return Object.freeze({
    getItem(key: string): string | null {
      const db = connection('Database.getItem')
      requireKey('Database.getItem', key)
      const rows = db.executeSync('SELECT value FROM one_kv WHERE key = ?', [key]).rows
      if (rows.length === 0) return null
      const value = rows[0]?.value
      if (typeof value !== 'string') {
        throw new Error('Database.getItem: stored value is not a string')
      }
      return value
    },
    setItem(key: string, value: string): void {
      const db = connection('Database.setItem')
      requireKey('Database.setItem', key)
      requireValue('Database.setItem', value)
      db.executeSync(
        'INSERT INTO one_kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, value]
      )
    },
    removeItem(key: string): void {
      const db = connection('Database.removeItem')
      requireKey('Database.removeItem', key)
      db.executeSync('DELETE FROM one_kv WHERE key = ?', [key])
    },
    getAllKeys(): string[] {
      const rows = connection('Database.getAllKeys').executeSync(
        'SELECT key FROM one_kv ORDER BY key'
      ).rows
      return rows.map((row) => {
        if (typeof row.key !== 'string') {
          throw new Error('Database.getAllKeys: stored key is not a string')
        }
        return row.key
      })
    },
    clear(): void {
      connection('Database.clear').executeSync('DELETE FROM one_kv')
    },
    close(): void {
      if (closed) return
      closed = true
      db.close()
    },
  })
}
