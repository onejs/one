import { invoke } from '@tauri-apps/api/core'
import { Moon, Sun, SunMoon } from '@tamagui/lucide-icons'
import { useSchemeSetting } from '@vxrn/color-scheme'
import { Appearance } from 'react-native'
import { isWeb } from 'tamagui'
import { ListItem } from '../ListItem'
import { useLayoutEffect } from 'react'

const schemeSettings = ['light', 'dark', 'system'] as const

export function ThemeToggleListItem() {
  const { onPress, Icon, setting, scheme } = useToggleTheme()

  useLayoutEffect(() => {
    setDarkModeTauri(scheme === 'dark')
  }, [scheme])

  return (
    <ListItem onPress={onPress} icon={Icon}>
      {setting[0].toUpperCase()}
      {setting.slice(1)}
    </ListItem>
  )
}

export function useToggleTheme() {
  const [{ setting, scheme }, setSchemeSetting] = useSchemeSetting()
  const Icon = setting === 'system' ? SunMoon : setting === 'dark' ? Moon : Sun

  return {
    setting,
    scheme,
    Icon,
    onPress: () => {
      const next = schemeSettings[(schemeSettings.indexOf(setting) + 1) % 3]

      if (!isWeb) {
        Appearance.setColorScheme(next === 'system' ? scheme : next)
      }

      setSchemeSetting(next)
    },
  }
}

const setDarkModeTauri = async (isDarkMode: boolean) => {
  try {
    console.log('invoking')
    await invoke('set_vibrancy', { isDarkMode })
  } catch (e) {
    console.error('Error applying vibrancy:', e)
  }
}
