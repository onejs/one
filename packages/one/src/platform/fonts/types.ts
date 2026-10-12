// font assets keyed by PostScript name. a number is an imported asset, a
// string is used as is: a file:// or https:// uri on native (release
// builds on android resolve to a bare res/raw name the module reads), a
// URL on web.
export type FontSource = number | string
export type FontMap = Readonly<Record<string, FontSource>>

export interface Fonts {
  // resolves when every font is usable, rejects with the first failure.
  // loading a name that is already usable resolves at once.
  // android limitation: Typeface exposes no name query, so a wrong key
  // registers the font silently and a later isLoaded for that key reads
  // true. always key by the file's PostScript name.
  load(fonts: FontMap): Promise<void>
  // synchronous, asks the platform, so it is also true for embedded and
  // system fonts. there is no JS record of loaded names.
  isLoaded(name: string): boolean
}

export type UseFontsResult = readonly [loaded: boolean, error: Error | null]
