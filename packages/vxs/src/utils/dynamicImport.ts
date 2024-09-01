// adds vite-ignore to avoid warning logs in vite:

export const dynamicImport = (path: string) => {
  return import(
    /* @vite-ignore */
    path
  )
}
