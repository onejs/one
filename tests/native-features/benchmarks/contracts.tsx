import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import FileSystem from '../fixtures/one-native-file-system'
import ImageManipulator from '../fixtures/one-native-image-manipulator'
import Motion from '../fixtures/one-native-motion'
export default function Contracts() {
  const [name, setName] = useState('filesystem')
  return (
    <View style={{ flex: 1, paddingTop: 50 }}>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {['filesystem', 'image', 'motion'].map((value) => (
          <Pressable
            key={value}
            testID={`contract-${value}`}
            onPress={() => setName(value)}
          >
            <Text>{value}</Text>
          </Pressable>
        ))}
      </View>
      {name === 'filesystem' ? (
        <FileSystem />
      ) : name === 'image' ? (
        <ImageManipulator />
      ) : (
        <Motion />
      )}
    </View>
  )
}
