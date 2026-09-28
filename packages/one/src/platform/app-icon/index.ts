const unsupported = (): never => {
  throw new Error('AppIcon requires an iOS native build')
}

export const AppIcon = Object.freeze({
  isSupported: (): Promise<boolean> => unsupported(),
  getCurrentName: (): Promise<string | undefined> => unsupported(),
  setIcon: (_name?: string): Promise<void> => unsupported(),
})
