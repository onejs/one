import {
  Button as TamaguiButton,
  createStyledHOC,
  styled,
  XStack,
  YStack,
  type GetProps,
  type XStackProps,
} from 'tamagui'
import { GLASS_LIFT } from '../glass/glass'
import { GlassView } from '../glass/GlassView'

// the app button every template builds on. a bare button is the theme's
// control; `accent` is the primary action, `subtle` a quiet fill, and `glass`
// floats over content on the kit's glass as a capsule, or a circle when it is
// as wide as it is tall. glass buttons that belong together share one capsule
// in a ButtonGroup, the way a toolbar groups its items.

// a glass button and a grouped one are both a clear capsule over glass
const capsule = {
  position: 'relative',
  z: 0,
  rounded: 9999,
  bg: 'transparent',
  borderWidth: 0,
} as const

const ButtonFrame = styled(TamaguiButton, {
  hitSlop: 9,
  rounded: '5',
  fontWeight: '700',
  cursor: 'pointer',
  // a filled button needs no outline; `variant="outlined"`, the quiet
  // unfilled one, is the only bordered button.
  borderColor: 'transparent',
  variants: {
    variant: {
      outlined: {
        borderColor: 'border-color hover:border-color-hover',
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        cursor: 'default',
        pointerEvents: 'none',
      },
    },
    accent: {
      true: {
        bg: 'accent-background',
        color: 'accent-color',
        borderColor: 'accent-background',
      },
    },
    glass: {
      true: { ...capsule, boxShadow: GLASS_LIFT },
    },
    // one of a ButtonGroup's buttons: the group is the glass and the lift.
    grouped: {
      true: capsule,
    },
    subtle: {
      true: {
        bg: 'color-2 hover:color-3 press:color-4',
      },
    },
  } as const,
})

// the glass sits under a button's label as its own layer, above the frame's
// own fill and below its content, so padding, gap and press states stay the
// frame's.
function GlassLayer() {
  return (
    <GlassView
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: 9999,
        zIndex: -1,
      }}
    />
  )
}

// a styled HOC keeps it a styled component: apps style() over it, refs reach
// the frame and Link asChild renders it as an anchor. the frame takes the theme,
// and a grouped button draws glass of its own only while a theme marks it on.
export const Button = createStyledHOC(
  ButtonFrame,
  (props, ref) => (
    <ButtonFrame ref={ref} {...props}>
      {props.glass || (props.grouped && props.theme) ? <GlassLayer /> : null}
      {props.children}
    </ButtonFrame>
  ),
  { disableTheme: true },
)

export type ButtonProps = GetProps<typeof Button>

export function ButtonGroup({
  vertical,
  children,
  ...props
}: XStackProps & { vertical?: boolean }) {
  const Stack = vertical ? YStack : XStack
  // buttons of different sizes share the group's centre line
  return (
    <Stack
      position="relative"
      z={0}
      rounded={9999}
      items="center"
      boxShadow={GLASS_LIFT}
      {...props}
    >
      <GlassLayer />
      {children}
    </Stack>
  )
}
