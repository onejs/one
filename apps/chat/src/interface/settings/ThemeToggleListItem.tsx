import { Moon, Sun, SunMoon } from '@tamagui/lucide-icons'
import { invoke } from '@tauri-apps/api/core'
import { useSchemeSetting } from '@vxrn/color-scheme'
import { useLayoutEffect } from 'react'
import { Appearance } from 'react-native'
import { isWeb } from 'tamagui'
import { isTauri } from '~/tauri/constants'
import { ListItem } from '../lists/ListItem'

const schemeSettings = ['light', 'dark', 'system'] as const

export function ThemeToggleListItem() {
  const { onPress, Icon, setting, scheme } = useToggleTheme()

  useLayoutEffect(() => {
    setDarkModeTauri(scheme === 'dark')
  }, [scheme])

  return (
    <ListItem onPress={onPress} icon={Icon}>
      Theme: {setting[0].toUpperCase()}
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
  if (!isTauri) return
  try {
    await invoke('set_vibrancy', { isDarkMode })
  } catch (e) {
    console.error('Error applying vibrancy:', e)
  }
}
