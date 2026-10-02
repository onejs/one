import { useThemeName } from 'tamagui'
export const useIsDark = () => useThemeName().startsWith('dark')
