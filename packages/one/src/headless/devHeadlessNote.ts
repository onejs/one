const noted = new Set<string>()

// one-line dev note the first time a navigator renders headless on web,
// so the missing native chrome never reads as breakage
export function devHeadlessNote(navigator: string) {
  if (process.env.NODE_ENV === 'development' && !noted.has(navigator)) {
    noted.add(navigator)
    console.info(
      `[one] <${navigator}> renders headless on web (just the matched route). ` +
        `Pass your own layout as a child, or build one with use${navigator}().`
    )
  }
}
