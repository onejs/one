let _isRolldown: boolean | undefined

export async function isRolldown(): Promise<boolean> {
  if (_isRolldown !== undefined) {
    return _isRolldown
  }

  try {
    // @ts-expect-error - withFilter only exists in rolldown-vite
    const vite = await import('vite')
    _isRolldown = 'withFilter' in vite
  } catch {
    _isRolldown = false
  }

  return _isRolldown
}
