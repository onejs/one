export const AppIcon = Object.freeze({
  isSupported: (): Promise<boolean> => Promise.resolve(false),
  getCurrentName: (): Promise<string | undefined> => Promise.resolve(''),
  setIcon: (_name?: string): Promise<void> => Promise.resolve(),
})
