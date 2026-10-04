import type { CSSProperties } from 'react'
import { DomView } from '../web/DomView'
import type { BlurProps, BlurTint } from './types'

function material(tint: BlurTint): { color: string; opacity: number } {
  const dark = tint === 'dark' || tint.endsWith('Dark')
  const color = dark ? '0,0,0' : '255,255,255'
  const opacity = tint.includes('UltraThin')
    ? 0.12
    : tint.includes('Thin')
      ? 0.2
      : tint.includes('Thick')
        ? 0.5
        : tint.includes('Chrome')
          ? 0.6
          : tint === 'extraLight'
            ? 0.15
            : tint === 'prominent'
              ? 0.45
              : 0.3
  return { color, opacity }
}

export function Blur({
  intensity = 50,
  tint = 'default',
  children,
  ...props
}: BlurProps) {
  const strength = Math.max(0, Math.min(1, intensity / 100))
  const { color, opacity } = material(tint)
  const adaptive =
    !['light', 'dark', 'extraLight'].includes(tint) &&
    !tint.endsWith('Light') &&
    !tint.endsWith('Dark')
  const veil = adaptive
    ? `light-dark(rgba(255,255,255,${strength * opacity}),rgba(0,0,0,${strength * opacity}))`
    : `rgba(${color},${strength * opacity})`
  const background: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    borderRadius: 'inherit',
    backdropFilter: `blur(${strength * 20}px)`,
    WebkitBackdropFilter: `blur(${strength * 20}px)`,
    colorScheme: 'light dark',
    backgroundColor: veil,
  }
  return (
    <DomView {...props}>
      <div aria-hidden style={background} />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        {children}
      </div>
    </DomView>
  )
}
