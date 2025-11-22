import { useLoader } from 'one'
import { Text } from 'tamagui'

export async function loader() {
  return {
    success: 'loader-success-two',
  }
}

export default () => {
  return <Text id="loader-data-two">{useLoader(loader).success}</Text>
}
