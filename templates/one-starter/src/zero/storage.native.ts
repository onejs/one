import { opSQLiteStoreProvider } from '@rocicorp/zero/op-sqlite'
export function createKVStore(userId: string | null) {
  return userId && userId !== 'anon' ? opSQLiteStoreProvider() : 'mem'
}
