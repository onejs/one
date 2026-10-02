import { isClient } from '@tamagui/constants'
export function createKVStore(userId: string | null): 'idb' | 'mem' {
  // use idb for logged in users on web client
  if (isClient && userId && userId !== 'anon') {
    return 'idb'
  }

  // fallback to memory for anonymous users or server
  return 'mem'
}
