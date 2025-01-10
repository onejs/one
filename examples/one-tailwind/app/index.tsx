import { Text, View } from 'react-native'
import './base.css'

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
      }}
    >
      <Text>Hello world, from One</Text>
      {/* <div className="bg-red-500 p-4 border uppercase">this is bg should be red by tailwind</div> */}
    </View>
  )
}
