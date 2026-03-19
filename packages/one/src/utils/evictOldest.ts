/**
 * evict the oldest entries from a map when it exceeds a size threshold.
 * entries are iterated in insertion order, so the first entries are the oldest.
 */
export function evictOldest(map: Map<any, any>, threshold: number, count: number) {
  if (map.size > threshold) {
    const iter = map.keys()
    for (let i = 0; i < count; i++) {
      const key = iter.next().value
      if (key) map.delete(key)
    }
  }
}
