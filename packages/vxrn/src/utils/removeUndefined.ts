type RemoveUndefined<T> = {
  [K in keyof T]: T[K] extends undefined ? never : T[K]
}

export function removeUndefined<T extends object>(obj: T): RemoveUndefined<T> {
  const result = {} as RemoveUndefined<T>

  for (const key in obj) {
    if (obj[key] !== undefined) {
      // @ts-expect-error
      result[key] = obj[key] as RemoveUndefined<T>[keyof T]
    }
  }

  return result
}
