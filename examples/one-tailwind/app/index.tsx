// debug
import {  Text, View } from 'react-native'
import './base.css'

export default function Index() {
  const out = (
    <div className="bg-red-500 p-4 border uppercase">this is bg should be red by tailwind</div>
  )

  console.log('what is', typeof out.props.children, typeof out.props.children?.props)

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
      <Text className="bg-red-500 p-4">Hello world, from One</Text>

      <View style={{ $$css: true, test: 'w-10 h-10 bg-blue-500' }} />

      {/* {out} */}
    </View>
  )
}
