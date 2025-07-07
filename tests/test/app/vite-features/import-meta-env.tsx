import { View, Text } from 'react-native'

export default function ImportMetaEnv() {
  return (
    <View style={{ paddingVertical: 80 }}>
      <Text>JSON.stringify(import.meta.env):</Text>
      <Text testID="import-meta-env-value-json">{JSON.stringify(import.meta.env)}</Text>

      <Text>import.meta.env.VITE_TEST_ENV_VAR_1:</Text>
      <Text testID="import-meta-env-VITE_TEST_ENV_VAR_1-value">
        {import.meta.env.VITE_TEST_ENV_VAR_1}
      </Text>

      <Text>import.meta.env['VITE_TEST_ENV_VAR_1']:</Text>
      <Text testID="import-meta-env-VITE_TEST_ENV_VAR_1-value-2">
        {import.meta.env['VITE_TEST_ENV_VAR_1']}
      </Text>
    </View>
  )
}
