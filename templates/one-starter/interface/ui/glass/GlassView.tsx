// the kit's glass surface, one entry, legs by platform: ios draws liquid
// glass, android a system blur under a theme wash, web backdrop-filter over a
// translucent fill (glass.ts). the split lives one relative hop behind this
// entry for the reason toast/ToastSurface gives: the exports map never names a
// file with a `.ios` or `.android` sibling.
export * from './GlassViewImpl'
export type { GlassViewProps } from './glass'
