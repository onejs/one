let _isRolldown: boolean | undefined;

export async function isRolldown(): Promise<boolean> {
  if (_isRolldown !== undefined) {
    return _isRolldown;
  }

  try {
    const vite = await import("vite");
    // withFilter only exists in rolldown-vite
    _isRolldown = "withFilter" in vite;
  } catch {
    _isRolldown = false;
  }

  return _isRolldown;
}
