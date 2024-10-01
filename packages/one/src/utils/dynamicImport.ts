// adds vite-ignore to avoid warning logs in vite:

export const dynamicImport = (path: string) => {
  if (process.env.TAMAGUI_TARGET === 'native') {
    // import causes an "invalid expression" bug in react native
    // TODO make this work, probably needs to fetch + eval?
    console.warn(`dynamicImport TODO`, path)
    return require(path)
  }

  if (process.env.TAMAGUI_TARGET !== 'native') {
    return import(
      /* @vite-ignore */
      path
    )
  }
}
