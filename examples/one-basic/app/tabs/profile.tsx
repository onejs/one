import { View, Text, StyleSheet } from 'react-native'

export default function ProfileTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Tab</Text>
      <Text style={styles.description}>Your profile information goes here.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
})
