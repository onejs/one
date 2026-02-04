import { Link } from 'one'
import { Text } from 'react-native'

export default function Index() {
  return (
    <Text id="content">
      Hello, this is the page-in-basic-app-case page!{' '}
      <Link href="/page-in-basic-app-case"></Link>
    </Text>
  )
}
