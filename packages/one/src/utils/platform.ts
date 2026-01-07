// being a bit more thorough here because for some reason window as defined on native
export const isWeb =
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  typeof document !== 'undefined'
