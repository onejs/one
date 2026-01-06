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
    <Paragraph size="$3" color="$color11">
      {name}
    </Paragraph>
    <Badge variant={variant} fontFamily="$mono" size="$2">
      {version}
    </Badge>
  </XStack>
)

export const SupportedVersions = (props: YStackProps) => {
  return (
    <YStack gap="$2" {...props}>
      <Paragraph size="$2" color="$color9" fontFamily="$mono" mb="$1">
        Supported Versions
      </Paragraph>
      <VersionRow name="React Native" version={supportedVersions.reactNative} variant="green" />
      <VersionRow name="Expo SDK" version={supportedVersions.expo} variant="purple" />
      <VersionRow name="Metro" version={supportedVersions.metro} variant="blue" />
      <VersionRow name="React" version={supportedVersions.react} variant="blue" />
    </YStack>
  )
}

export const SupportedVersionsCompact = (props: YStackProps) => {
  return (
    <XStack flexWrap="wrap" gap="$2" ai="center" {...props}>
      <Paragraph size="$2" color="$color9" fontFamily="$mono">
        Supports:
      </Paragraph>
      <Badge variant="green" fontFamily="$mono" size="$1">
        RN {supportedVersions.reactNative}
      </Badge>
      <Badge variant="purple" fontFamily="$mono" size="$1">
        Expo {supportedVersions.expo}
      </Badge>
      <Badge variant="blue" fontFamily="$mono" size="$1">
        Metro {supportedVersions.metro}
      </Badge>
    </XStack>
  )
}
