import { View, Text, StyleSheet, Image } from 'react-native'
import vxrn from './assets/vxrn.png'

const App = () => {
  return (
    <View style={styles.container}>
      <Text>Hello, world!</Text>
      <Image source={vxrn} />
      <Image source={require('./assets/vxrn.png')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default App
