// Mock for react-native-screens used in vitest tests

export const Screen = 'Screen'
export const ScreenContainer = 'ScreenContainer'

export type ScreenStackHeaderConfigProps = {
  blurEffect?: string
  backgroundColor?: string
  largeTitleBackgroundColor?: string
  backButtonDisplayMode?: 'default' | 'minimal' | 'generic'
}

export type SearchBarProps = {
  placeholder?: string
  onChangeText?: (text: string) => void
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}
