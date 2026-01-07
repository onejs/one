import type { TextProps } from 'tamagui'
import { Badge } from '../features/docs/Badge'

const badgeStatuses = {
  stable: {
    theme: 'green',
    text: 'Stable',
  },
  'mostly-stable': {
    theme: 'blue',
    text: 'Mostly Stable',
  },
  developing: {
    theme: 'purple',
    text: 'Developing',
  },
  early: {
    theme: 'red',
    text: 'Early',
  },
  beta: {
    theme: 'pink',
    text: 'Beta',
  },
} as const

export const Status = ({
  is,
  text,
  ...rest
}: TextProps & {
  is: keyof typeof badgeStatuses
  /** Overrides the badge text */
  text?: string
}) => {
  const info = badgeStatuses[is]
  return (
    <Badge
      alignSelf="flex-start"
      fontFamily="$mono"
      letterSpacing={-0.5}
      dsp="inline-flex"
      y={-2}
      mx={6}
      variant={info.theme}
      {...rest}
    >
      {text || info.text}
    </Badge>
  )
}
