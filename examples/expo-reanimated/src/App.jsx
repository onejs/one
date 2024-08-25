import { StyleSheet, Text, View, Button } from 'react-native'
import Animated, { useSharedValue, withSpring } from 'react-native-reanimated'

export default function App() {
  const width = useSharedValue(100);

  const handlePress = () => {
    width.value = withSpring(width.value + 50);
  };

  return (
    <View style={styles.container}>
      <Text>https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/your-first-animation/</Text>
      <Animated.View
        style={{
          width,
          height: 100,
          backgroundColor: 'violet',
        }}
      />
      <Button onPress={handlePress} title="Click me" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
})
