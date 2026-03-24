// adapted from expo-router (MIT license) - https://github.com/expo/expo
import { PlatformColor, Platform, type ColorValue } from 'react-native'
import type { AndroidDynamicMaterialColorType } from './android.dynamic.types'
import type { AndroidStaticMaterialColorType } from './android.material.types'
import type { IOSBaseColor } from './ios.types'
import { Material3Color, Material3DynamicColor } from './materialColor'

export * from './android.dynamic.types'
export * from './android.material.types'
export * from './ios.types'

export type AndroidMaterialColor = AndroidStaticMaterialColorType & {
  [key: string]: ColorValue
}

export type AndroidDynamicMaterialColor = AndroidDynamicMaterialColorType & {
  [key: string]: ColorValue
}

export interface ColorType {
  ios: IOSBaseColor & { [key: string]: ColorValue }
  android: {
    material: AndroidMaterialColor
    dynamic: AndroidDynamicMaterialColor
    [key: string]: any
  }
}

const iosColor = new Proxy({} as ColorType['ios'], {
  get(_, prop: string) {
    if (Platform.OS === 'ios') return PlatformColor(prop)
    return null
  },
})

const androidMaterialColor = new Proxy({} as ColorType['android']['material'], {
  get(_, prop: string) {
    if (Platform.OS === 'android') return Material3Color(prop)
    return null
  },
})

const androidDynamicColor = new Proxy({} as ColorType['android']['dynamic'], {
  get(_, prop: string) {
    if (Platform.OS === 'android') return Material3DynamicColor(prop)
    return null
  },
})

const androidColor = new Proxy(
  {
    get material() {
      return androidMaterialColor
    },
    get dynamic() {
      return androidDynamicColor
    },
  } as ColorType['android'],
  {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop]
      if (Platform.OS === 'android') return PlatformColor('@android:color/' + prop)
      return null
    },
  }
)

export const Color: ColorType = {
  get ios() {
    return iosColor
  },
  get android() {
    return androidColor
  },
}
