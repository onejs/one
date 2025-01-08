import { Link, useLoader } from 'one'
import { Text } from 'tamagui'

export function loader() {
  return {
    success: 'loader-success',
  }
}

export default () => {
  return (
    <>
      <Text id="loader-data">{useLoader(loader).success}</Text>
      <Link href="/loader/other">go to other loader</Link>
    </>
  )
}
