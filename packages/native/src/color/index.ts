// adapted from expo-router (MIT license) - https://github.com/expo/expo
import type { ColorValue } from 'react-native'
import type { AndroidDynamicMaterialColorType } from './android.dynamic.types'
import type { AndroidStaticMaterialColorType } from './android.material.types'
import type { IOSBaseColor } from './ios.types'

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

// on web/ssr, return null for all platform colors
// on native, these are overridden by the .native.ts version
const iosColor = new Proxy({} as ColorType['ios'], {
  get() {
    return null
  },
})

const androidMaterialColor = new Proxy({} as ColorType['android']['material'], {
  get() {
    return null
  },
})

const androidDynamicColor = new Proxy({} as ColorType['android']['dynamic'], {
  get() {
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
