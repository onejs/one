import { GlassView } from '../glass/GlassView'
import { TOAST_RADIUS, type ToastSurfaceProps } from './toastGlass'

// web leg: the card is a translucent theme-tinted fill over backdrop blur.
// the padding lives on the content (ToastContent), not here, so the close
// button keeps anchoring to the full card box on every leg.
export function ToastSurface({ children }: ToastSurfaceProps) {
  return (
    <GlassView
      cornerRadius={TOAST_RADIUS}
      style={{ borderCurve: 'continuous', overflow: 'hidden' }}
    >
      {children}
    </GlassView>
  )
}
