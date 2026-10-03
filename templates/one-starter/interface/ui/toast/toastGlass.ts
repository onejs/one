import type { ReactNode } from 'react'

// the toast card is the kit's glass (glass/glass.ts): its ramp tokens resolve
// inside the toast's theme, so error toasts tint red while staying in
// appearance.
export const TOAST_RADIUS = 12

// tinted: the toast has a type, so its theme carries a hue for the glass
export type ToastSurfaceProps = { tinted: boolean; children: ReactNode }
