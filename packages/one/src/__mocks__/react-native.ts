// Mock for react-native used in vitest tests

export const StyleSheet = {
  create: <T extends Record<string, any>>(styles: T): T => styles,
  flatten: (style: any): any => {
    if (Array.isArray(style)) {
      return Object.assign({}, ...style.filter(Boolean))
    }
    return style || {}
  },
}

export const Platform = {
  OS: 'web',
  select: (obj: any) => obj.web || obj.default,
}

export const View = 'View'
export const Text = 'Text'
export const Pressable = 'Pressable'
