export type Identity = {
  // bump when the framework packaging contract changes, including script-only fixes.
  format: 3
  source: string
  dependencies: Record<string, string>
  xcode: string
  swift: string
  workletsFlags: Array<[string, string]>
  releaseGroups: string[]
  sqlite: 'zero' | 'external'
}
export type Archive = { file: string; sha256: string }
export type Manifest = {
  identity: Identity
  key: string
  archives: Record<'Debug' | 'Release', Archive>
}
export declare function identity(ios: string): Identity
export declare function artifactKey(value: Identity): string
export declare function sha256(file: string): Promise<string>
export declare function readManifest(value: unknown, expected: Identity): Manifest
export declare function publishedManifest(expected: Identity): Promise<Manifest | undefined>
export declare function downloadArchive(key: string, entry: Archive, destination: string): Promise<void>
export declare function install(ios: string, local?: string): Promise<{ path?: string; reason?: string }>
export declare function select(root: string, destination: string): void
