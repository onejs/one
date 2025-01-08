import { View } from 'react-native'
import * as BadDeps from '../src/bad-deps'
console.info('BadDeps', BadDeps)

export default () => {
  return <View style={{ width: 100, height: 100, backgroundColor: 'red' }} />
}
