// native bundler selection. omitted configuration selects rolldown
// (the `vite` native bundler); metro runs only when explicitly selected via
// native.bundler or ONE_METRO_MODE. neither direction falls back to the
// other: a failed rolldown build fails instead of starting metro.
export function resolveNativeBundler(args: {
  bundler?: 'metro' | 'vite'
}): 'vite' | 'metro' {
  if (args.bundler === 'metro' || process.env.ONE_METRO_MODE) return 'metro'
  return 'vite'
}
