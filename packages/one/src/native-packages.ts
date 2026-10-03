export type BlessedNativePackage = Readonly<{
  name: string
  range: string
  why: string
  platforms: readonly ('ios' | 'android')[]
  required: boolean
}>

// npm cannot express platform-specific peers; native commands enforce required.
export const blessedNativePackages = [
  {
    name: 'react-native-worklets',
    range: '~0.12.2',
    why: 'One sync state and UI runtime execution',
    platforms: ['ios', 'android'],
    required: true,
  },
  {
    name: 'react-native-reanimated',
    range: '~4.6.0',
    why: 'UI thread animations and layout transitions',
    platforms: ['ios', 'android'],
    required: true,
  },
  {
    name: 'react-native-gesture-handler',
    range: '~3.3.0',
    why: 'Native gesture worklets and drawer navigation',
    platforms: ['ios', 'android'],
    required: false,
  },
  {
    name: 'react-native-screens',
    range: '~4.27.0',
    why: 'Native stack, tabs and split view navigation',
    platforms: ['ios', 'android'],
    required: true,
  },
] as const satisfies readonly BlessedNativePackage[]
