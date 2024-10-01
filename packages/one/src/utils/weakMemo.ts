const cache = new WeakMap()

export function weakMemoObject(obj: any) {
  if (!cache.has(obj)) {
    const memoizedObj = {}
    for (const key of Object.keys(obj)) {
      if (!cache.has(obj[key])) {
        cache.set(obj[key], obj[key])
      }
      memoizedObj[key] = cache.get(obj[key])
    }
    cache.set(obj, memoizedObj)
  }
  return cache.get(obj)
}
