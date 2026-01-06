import { Paragraph, XStack, YStack, type YStackProps } from 'tamagui'
import { Badge } from '../features/docs/Badge'

// These are the currently supported versions for One
// Update these when new versions are supported
export const supportedVersions = {
  reactNative: '0.81',
  expo: '54',
  metro: '0.83',
  vite: '7',
  react: '19',
  reactNavigation: '7',
} as const

type VersionRowProps = {
  name: string
  version: string
  variant?: 'blue' | 'green' | 'purple' | 'red' | 'pink'
}

const VersionRow = ({ name, version, variant = 'blue' }: VersionRowProps) => (
  <XStack ai="center" jc="space-between" gap="$4">
    <Paragraph size="$4" color="$color11">
      {name}
    </Paragraph>
    <Badge variant={variant} fontFamily="$mono" size="$1">
      {version}
    </Badge>
  </XStack>
)

export const SupportedVersions = (props: YStackProps) => {
  return (
    <YStack gap="$2" {...props}>
        <Paragraph size="$1" fontFamily="$mono" bbw={0.5} bbc='$color4' mb="$2" pb="$2">
        Supported Versions
      </Paragraph>
      <VersionRow name="React" version={supportedVersions.react} variant="blue" />
      <VersionRow name="React Native" version={supportedVersions.reactNative} variant="green" />
      <VersionRow name="Expo SDK" version={supportedVersions.expo} variant="purple" />
      <VersionRow name="Metro" version={supportedVersions.metro} variant="blue" />
    </YStack>
  )
}
