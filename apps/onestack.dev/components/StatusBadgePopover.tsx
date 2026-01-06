import { useState } from 'react'
import { Adapt, Popover, Sheet, YStack, type TextProps } from 'tamagui'
import { Badge } from '../features/docs/Badge'
import { SupportedVersions } from './SupportedVersions'

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

export const StatusBadgePopover = ({
  is,
  text,
  ...rest
}: TextProps & {
  is: keyof typeof badgeStatuses
  text?: string
}) => {
  const [open, setOpen] = useState(false)
  const info = badgeStatuses[is]

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      size="$5"
      allowFlip
      stayInFrame={{ padding: 10 }}
    >
      <Popover.Trigger asChild>
        <Badge
          alignSelf="flex-start"
          fontFamily="$mono"
          letterSpacing={-0.5}
          dsp="inline-flex"
          y={-2}
          mx={6}
          variant={info.theme}
          cur="pointer"
          hoverStyle={{
            opacity: 0.8,
          }}
          pressStyle={{
            opacity: 0.7,
          }}
          {...rest}
        >
          {text || info.text}
        </Badge>
      </Popover.Trigger>

      <Adapt platform="touch" when="sm">
        <Sheet
          modal
          dismissOnSnapToBottom
          animation="quick"
          zIndex={100000000}
          snapPointsMode="fit"
        >
          <Sheet.Frame p="$4" pb="$6" bg="$background">
            <Sheet.Handle mb="$2" />
            <SupportedVersions />
          </Sheet.Frame>
          <Sheet.Overlay
            animation="lazy"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            bg="$background075"
          />
        </Sheet>
      </Adapt>

      <Popover.Content
        enterStyle={{ y: -10, opacity: 0 }}
        exitStyle={{ y: -10, opacity: 0 }}
        animation={[
          'quick',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
        p="$4"
        bg="$background"
        elevation="$4"
        br="$4"
      >
        <Popover.Arrow bg="$background" size="$3" />
        <SupportedVersions />
      </Popover.Content>
    </Popover>
  )
}
