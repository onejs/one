/** Props passed to a layout's `SuspenseFallback` export. */
export type SuspenseFallbackProps = {
  /** The suspended route module's context key, such as `./profile/[id].tsx`. */
  route: string
  /** The suspended route's URL parameters. */
  params: Record<string, string | string[]>
}
