// adds vite-ignore to avoid warning logs in vite:

export const dynamicImport = (path: string) => {
  if (process.env.TAMAGUI_TARGET === "native") {
    // import causes an "invalid expression" bug in react native
    // TODO make this work, probably needs to fetch + eval?
    console.info(`dynamicImport TODO`, path);
    // return require(path)
    return Promise.resolve(undefined);
  }

  if (process.env.TAMAGUI_TARGET !== "native") {
    return import(
      /* @vite-ignore */
      path
    );
  }
};
