import { useEffect } from 'react'
import { useNavigation } from 'one'

export const useSetNavigationOptions = (options: Object) => {
  const navigation = useNavigation()

  useEffect(() => {
    navigation.setOptions(options)
  }, Object.values(options))
}
