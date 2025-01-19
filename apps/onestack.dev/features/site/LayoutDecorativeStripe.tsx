import { memo } from 'react'
import { YStack } from 'tamagui'
import { usePathname } from 'one'
import { themeTokenNumber } from '~/features/site/headerColors'

export const LayoutDecorativeStripe = memo(() => {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const y = isHome ? -52 : -69

  return (
    <YStack
      pos={isHome ? 'absolute' : ('fixed' as any)}
      zi={100000}
      t={0}
      l={0}
      r={0}
      h={150}
      scaleY={-1}
      bg={`$yellow${themeTokenNumber.light}`}
      $theme-dark={{
        bg: `#000`,
      }}
      y={y}
      $platform-web={{
        transition: `
          clip-path 400ms cubic-bezier(0.175, 0.885, 0.32, 2),
          transform 400ms cubic-bezier(0.175, 0.885, 0.32, 2)`,
        clipPath: isHome ? convex : concave,
      }}
    />
  )
})
const convex = getClipPath(0.05)[0]
const concave = getClipPath(0.05)[1]

function getClipPath(
  // adjust the bendyness
  amplitude = 0.5
) {
  const N = 300 // number of points / smoothness
  const cx = 0.5 // center x-coordinate
  const cy = 0.5 // center y-coordinate
  const r = 0.5 // radius

  // generate points for the inverted arc (cutout at the top)
  const pointsTrue: string[] = []

  // generate points for the regular arc (bulging out at the top)
  const pointsFalse: string[] = []

  // start from the bottom-left corner
  pointsTrue.push('0% 100%')
  pointsFalse.push('0% 100%')

  // bottom-right corner
  pointsTrue.push('100% 100%')
  pointsFalse.push('100% 100%')

  // generate points along the arc from right to left
  for (let i = N - 1; i >= 0; i--) {
    const x = i / (N - 1)
    const dx = x - cx
    const dy = Math.sqrt(Math.max(r * r - dx * dx, 0))

    // scale dy to adjust the amplitude
    const dyScaled = (dy / r) * amplitude

    // for the inverted arc (cutout at the top)
    const yTrue = cy + dyScaled

    // for the regular arc (bulging out at the top)
    const yFalse = cy - dyScaled

    const xPercent = (x * 100).toFixed(1) + '%'
    const yTruePercent = (yTrue * 100).toFixed(1) + '%'
    const yFalsePercent = (yFalse * 100).toFixed(1) + '%'

    pointsTrue.push(`${xPercent} ${yTruePercent}`)
    pointsFalse.push(`${xPercent} ${yFalsePercent}`)
  }

  // top-left corner
  pointsTrue.push('0% 0%')
  pointsFalse.push('0% 0%')

  // create the clippath strings
  const clipPathTrue = `polygon(${pointsTrue.join(', ')})`
  const clipPathFalse = `polygon(${pointsFalse.join(', ')})`

  return [clipPathTrue, clipPathFalse]
}
