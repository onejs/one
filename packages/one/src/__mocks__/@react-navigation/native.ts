// Mock for @react-navigation/native used in vitest tests

export const useNavigation = () => ({
  navigate: () => {},
  goBack: () => {},
  setOptions: () => {},
  getParent: () => null,
})

export const NavigationContainer = ({ children }: any) => children

export type NavigationProp<T = any> = {
  navigate: (route: string, params?: any) => void
  goBack: () => void
  setOptions: (options: any) => void
  getParent: (id?: string) => any
}

export type ParamListBase = Record<string, object | undefined>
export type StackNavigationState<T> = any
export type EventMapBase = any
